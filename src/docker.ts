import Docker from "dockerode";
import path from "path";

// ডকার সকেট কানেকশন (Linux/VPS এ সাধারণত /var/run/docker.sock ব্যবহার হয়)
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

export class DockerManager {
  /**
   * প্রজেক্টের জন্য আইসোলেটেড ডকার কন্টেইনার তৈরি ও রান করবে
   */
  static async createAndStartContainer(
    projectId: string,
    runtime: string,
    sourceDir: string,
    envVars: Record<string, string> = {}
  ): Promise<string> {
    let image = "node:20-alpine"; // ডিফল্ট Node.js ইমেজ

    if (runtime === "python") {
      image = "python:3.11-alpine";
    } else if (runtime === "html") {
      image = "nginx:alpine";
    }

    // স্টার্টআপ কমান্ড বা ডিফল্ট কমান্ড নির্ধারণ
    let cmd: string[] | undefined = undefined;
    if (runtime === "python") {
      cmd = ["python", "main.py"];
    } else if (runtime === "node") {
      cmd = ["npm", "start"];
    }

    // এনভায়রনমেন্ট ভেরিয়েবলগুলোকে ডকার ফরম্যাটে রূপান্তর
    const envArray = Object.entries(envVars).map(([k, v]) => `${k}=${v}`);

    // কন্টেইনার কনফিগারেশন (রিসোর্স লিমিট ও সিকিউরিটি পলিসি সহ)
    const containerConfig: Docker.ContainerCreateOptions = {
      Image: image,
      Cmd: cmd,
      WorkingDir: "/app",
      HostConfig: {
        Binds: [`${path.resolve(sourceDir)}:/app:rw`],
        Memory: 256 * 1024 * 1024, // সর্বোচ্চ ২৫৬ মেগাবাইট (RAM Limit)
        CpuPeriod: 100000,
        CpuQuota: 25000,           // ০.২৫৫ বা নির্দিষ্ট পরিমাণ CPU Limit
        NetworkMode: "bridge",
        AutoRemove: false,
      },
      Env: envArray,
      User: "1000:1000",          // নন-রুট ইউজার হিসেবে রান হবে (ফুল সিকিউরিটি)
    };

    const container = await docker.createContainer(containerConfig);
    await container.start();

    return container.id;
  }

  /**
   * কন্টেইনার বন্ধ করা
   */
  static async stopContainer(containerId: string): Promise<void> {
    try {
      const container = docker.getContainer(containerId);
      await container.stop({ t: 5 });
    } catch (error) {
      console.error(`Error stopping container ${containerId}:`, error);
    }
  }

  /**
   * কন্টেইনার সম্পূর্ণ ডিলিট করা
   */
  static async removeContainer(containerId: string): Promise<void> {
    try {
      const container = docker.getContainer(containerId);
      try {
        await container.stop({ t: 2 });
      } catch (e) {
        // অলরেডি বন্ধ থাকলে ইগনোর করবে
      }
      await container.remove({ force: true });
    } catch (error) {
      console.error(`Error removing container ${containerId}:`, error);
    }
  }

  /**
   * কন্টেইনার রানিং আছে কিনা বা স্ট্যাটাস চেক করা
   */
  static async getContainerStats(containerId: string) {
    try {
      const container = docker.getContainer(containerId);
      const data = await container.inspect();
      return {
        status: data.State.Status, // running, exited, etc.
        running: data.State.Running,
        exitCode: data.State.ExitCode,
      };
    } catch (error) {
      return null;
    }
  }
}