import React from "react";

// Bottom navigation bar (Home / Maps / Forms / Account) removed app-wide
// per user request. Each page already has its own header / back navigation.
// Component kept (imported by several pages) so they don't break — it now
// renders nothing.
export default function BottomNav() {
  return null;
}