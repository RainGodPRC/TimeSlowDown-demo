import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.tsd.timedown',
  appName: 'TSD',
  webDir: 'www',  // 静态文件在 www/ 子目录
  ios: {
    contentInset: 'always',
    backgroundColor: '#faf6ef',
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    Camera: {
      // 用户主动拍照/选照片时才请求权限
    },
    LocalNotifications: {
      smallIcon: 'ic_notification',
      iconColor: '#c8873c',
      sound: 'tsd_chime',
    },
  },
  server: {
    // 开发时可以指向本地 server
    // url: 'http://localhost:8767',
    // cleartext: true,
  },
};

export default config;
