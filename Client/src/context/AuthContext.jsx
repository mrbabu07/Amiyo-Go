import { createContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/firebase.config";
import { getCurrentUser } from "../services/api";

export const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // register
  const createUser = (email, password) => {
    setLoading(true);
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // login
  const signIn = (email, password) => {
    setLoading(true);
    return signInWithEmailAndPassword(auth, email, password);
  };

  // google login
  const googleLogin = () => {
    setLoading(true);
    return signInWithPopup(auth, googleProvider);
  };

  // logout
  const logOut = () => {
    setLoading(true);
    setIsAdmin(false);

    // Clear all offer popup flags from sessionStorage
    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("offerPopupShown_")) {
        sessionStorage.removeItem(key);
      }
    });

    return signOut(auth);
  };

  // auth observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          console.log("🔍 Fetching user data for:", currentUser.email);
          console.log("🔑 Current Firebase UID:", currentUser.uid);
          
          const response = await getCurrentUser();
          console.log("📦 User response:", response);
          console.log("👤 User data:", response.data);
          
          // Extract role from nested data structure
          const userData = response.data?.data;
          const userRole = userData?.role;
          
          console.log("🎭 User role:", userRole);
          console.log("📋 Full user object:", JSON.stringify(userData, null, 2));
          
          const isUserAdmin = userRole === "admin";
          
          setIsAdmin(isUserAdmin);
          console.log("✅ isAdmin set to:", isUserAdmin);
          
          if (!isUserAdmin && currentUser.email === "admin@bazarbd.com") {
            console.error("⚠️ WARNING: admin@bazarbd.com is not showing as admin!");
            console.error("⚠️ This means the backend is returning wrong role");
            console.error("⚠️ Check backend logs for user lookup");
          }
        } catch (error) {
          console.error("❌ Failed to fetch user data:", error);
          console.error("Error details:", error.response?.data);
          setIsAdmin(false);
        }
      } else {
        console.log("👤 No user logged in");
        setIsAdmin(false);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const authInfo = {
    user,
    loading,
    isAdmin,
    createUser,
    signIn,
    googleLogin,
    logOut,
  };

  return (
    <AuthContext.Provider value={authInfo}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
