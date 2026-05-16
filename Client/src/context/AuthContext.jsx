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
import { getCurrentUser, getMyVendorProfile } from "../services/api";

export const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();
const ADMIN_ROLES = ["admin", "manager", "support", "moderator"];

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [dbUser, setDbUser] = useState(null);
  const [jwtClaims, setJwtClaims] = useState({});
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminStaff, setIsAdminStaff] = useState(false);

  const createUser = (email, password) => {
    setLoading(true);
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const signIn = (email, password) => {
    setLoading(true);
    return signInWithEmailAndPassword(auth, email, password);
  };

  const googleLogin = () => {
    setLoading(true);
    return signInWithPopup(auth, googleProvider);
  };

  const resetAuthMetadata = () => {
    setDbUser(null);
    setJwtClaims({});
    setVendorProfile(null);
    setIsAdmin(false);
    setIsAdminStaff(false);
  };

  const logOut = () => {
    setLoading(true);
    resetAuthMetadata();

    Object.keys(sessionStorage).forEach((key) => {
      if (key.startsWith("offerPopupShown_")) {
        sessionStorage.removeItem(key);
      }
    });

    return signOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const response = await getCurrentUser();
          const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
          const userData = response.data?.data || null;
          const claims = tokenResult?.claims || {};
          const userRole = userData?.role || claims.role || null;

          setJwtClaims(claims);
          setDbUser(userData);
          setIsAdmin(userRole === "admin");
          setIsAdminStaff(ADMIN_ROLES.includes(userRole));

          try {
            const vendorResponse = await getMyVendorProfile();
            setVendorProfile(vendorResponse.data?.vendor || null);
          } catch (vendorError) {
            if (vendorError.response?.status !== 404) {
              console.error("Failed to fetch vendor profile:", vendorError);
            }
            setVendorProfile(null);
          }
        } catch (error) {
          console.error("Failed to fetch user data:", error);
          resetAuthMetadata();
        }
      } else {
        resetAuthMetadata();
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const authInfo = {
    user,
    dbUser,
    jwtRole: jwtClaims.role || null,
    role: dbUser?.role || jwtClaims.role || null,
    permissions: dbUser?.permissions || {},
    vendorProfile,
    vendorStatus: vendorProfile?.status || null,
    loading,
    isAdmin,
    isAdminStaff,
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
