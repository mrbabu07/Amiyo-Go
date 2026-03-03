import { auth } from "../firebase/firebase.config";

export const getCurrentUserToken = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  } catch (error) {
    console.error("Error getting user token:", error);
    return null;
  }
};

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const isUserAuthenticated = () => {
  return !!auth.currentUser;
};
