import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export class StorageManager {
  private static baseStorage = process.env.STORAGE_PATH || path.join(process.cwd(), "storage");

  // ইউজারের নিজস্ব স্টোরেজ ফোল্ডার পাথ বের করা
  static getUserDir(userId: number): string {
    return path.join(this.baseStorage, "users", userId.toString());
  }

  // নির্দিষ্ট প্রজেক্টের সোর্স কোড ফোল্ডার পাথ বের করা
  static getProjectDir(userId: number, projectId: string): string {
    return path.join(this.getUserDir(userId), "projects", projectId, "source");
  }

  // সিকিউর জিপ এক্সট্রাকশন (Zip Slip ও Path Traversal অ্যাটাক প্রিভেন্ট করার জন্য)
  static extractZipSafe(zipFilePath: string, outputDir: string): boolean {
    try {
      const zip = new AdmZip(zipFilePath);
      const zipEntries = zip.getEntries();

      // সিকিউরিটি চেক: জিপ ফাইলের ভেতরে কোনো ম্যালিসিয়াস পাথ আছে কিনা দেখা
      for (const entry of zipEntries) {
        if (entry.entryName.includes("..") || path.isAbsolute(entry.entryName)) {
          throw new Error("Security Alert: Malicious path traversal detected in ZIP archive!");
        }
      }

      // টার্গেট ডিরেক্টরি তৈরি করে ফাইল এক্সট্রাক্ট করা
      fs.mkdirSync(outputDir, { recursive: true });
      zip.extractAllTo(outputDir, true);
      return true;
    } catch (error) {
      console.error("ZIP Extraction Error:", error);
      return false;
    }
  }

  // ফোল্ডার বা ফাইল মুছে ফেলার নিরাপদ ফাংশন
  static deleteDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}