export function getMobileAppLinks() {
  const apkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || "";
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || "";

  return {
    apkUrl,
    playStoreUrl,
    hasApk: apkUrl.length > 0,
    hasPlayStore: playStoreUrl.length > 0,
  };
}