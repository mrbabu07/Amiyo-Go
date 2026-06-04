import University from "../University";
import { adminUniversityQuickGuides, adminUniversityRole } from "../../data/universityAdmin";

const ADMIN_ROLES = [adminUniversityRole];
const ADMIN_UNIVERSITY_HERO = {
  title: "Admin operating guide",
  description: {
    en: "Protected operator guides for approvals, moderation, finance, logistics, trust, analytics, staff, and audit.",
    bn: "অ্যাপ্রুভাল, মডারেশন, ফাইন্যান্স, লজিস্টিকস, ট্রাস্ট, অ্যানালিটিক্স, স্টাফ ও অডিটের protected operator guide.",
  },
};

export default function AdminUniversity() {
  return (
    <University
      roles={ADMIN_ROLES}
      quickGuides={adminUniversityQuickGuides}
      heroCopy={ADMIN_UNIVERSITY_HERO}
      defaultRole="admin"
    />
  );
}
