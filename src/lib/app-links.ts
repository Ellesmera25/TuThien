export function getMobileAppLinks() {
  // Thử lấy APK URL từ env variable trước, nếu không có thì dùng file mặc định
  const envApkUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL?.trim() || "";
  const apkUrl = envApkUrl || "/tuthien-app.apk";
  const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || "";

  // Logging để debug
  if (typeof window !== "undefined") {
    console.log("[Mobile App Links]", {
      envApkUrl: envApkUrl || "not set",
      apkUrl,
      playStoreUrl: playStoreUrl || "not set",
      hasApk: apkUrl.length > 0,
      hasPlayStore: playStoreUrl.length > 0,
    });
  }

  return {
    apkUrl,
    playStoreUrl,
    hasApk: apkUrl.length > 0,
    hasPlayStore: playStoreUrl.length > 0,
  };
}