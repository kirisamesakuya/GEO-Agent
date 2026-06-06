export const USER_PROFILE_UPDATED_EVENT = 'geo:user-profile-updated';

export interface UserProfile {
  /** 用户昵称 */
  displayName: string;
  /** 注册手机号 */
  phone: string;
}

const STORAGE_KEY = 'geo_user_profile';

const DEFAULT_PROFILE: UserProfile = {
  displayName: '张小北',
  phone: '',
};

export function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile> & { jobTitle?: string; email?: string };
      return {
        displayName: String(parsed.displayName ?? DEFAULT_PROFILE.displayName),
        phone: String(parsed.phone ?? ''),
      };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(profile: UserProfile) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      displayName: profile.displayName.trim(),
      phone: profile.phone.trim(),
    })
  );
  window.dispatchEvent(new Event(USER_PROFILE_UPDATED_EVENT));
}
