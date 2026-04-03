"use client";

import {
  changePassword,
  getSession,
  signIn,
  signOut,
  subscribe,
  updateProfile,
} from "@/mocks/store";
import { useSyncExternalStore } from "react";

type SignInInput = {
  email: string;
  password: string;
};

type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export const auth = {
  useSession() {
    const session = useSyncExternalStore(subscribe, getSession, getSession);
    return {
      data: session,
      isPending: false,
    };
  },

  signIn: {
    async email(input: SignInInput) {
      const result = signIn(input.email, input.password);
      if (result.error) {
        return { error: { message: result.error } };
      }
      return { data: result.session, error: null };
    },
  },

  async signOut() {
    signOut();
  },

  async updateUser(input: { name: string }) {
    return updateProfile(input.name);
  },

  async changePassword(input: ChangePasswordInput) {
    return changePassword(input.currentPassword, input.newPassword);
  },
};
