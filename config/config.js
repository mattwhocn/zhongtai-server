const path = require('path');

const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3001
  },

  // 文件路径配置
  paths: {
    // 基础目录
    base: path.join(__dirname, '../../'),
    data: path.join(__dirname, '../../data'),
    
    // 子目录
    get images() {
      return path.join(this.data, 'images');
    },
    get uploads() {
      return path.join(this.data, 'uploads');
    },
    get json() {
      return path.join(this.data, 'json');
    }
  },

  // 模块配置
  modules: [
    'banner',
    'tech',
    'jobs',
    'news',
  ]
};

module.exports = config; 