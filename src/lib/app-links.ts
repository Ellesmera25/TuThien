export function getMobileAppLinks() {
  const envApkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || "";
  const apkUrl = envApkUrl || "/tuthien-app.apk";
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || "";

  return {
    apkUrl,
    playStoreUrl,
    hasApk: apkUrl.length > 0,
    hasPlayStore: playStoreUrl.length > 0,
  };
}
