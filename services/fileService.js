const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const debug = require('debug')('app:server');

class FileService {
  constructor(imagesDir, uploadsDir, excelService) {
    this.imagesDir = imagesDir;
    this.uploadsDir = uploadsDir;
    this.jsonDir = config.paths.json;
    this.excelService = excelService;
    this.markdownPath = config.paths.markdown;
  }

  ensureDirectories() {
    // 确保基础目录存在
    [this.imagesDir, this.uploadsDir, this.jsonDir, this.markdownPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // 确保每个模块的目录都存在
    config.modules.forEach(module => {
      const moduleUploadDir = path.join(this.uploadsDir, module);
      const moduleJsonDir = path.join(this.jsonDir, module);
      [moduleUploadDir, moduleJsonDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
    });
  }

  // 获取图片列表
  getImageList() {
    const files = fs.readdirSync(this.imagesDir);
    return files
      .map(file => {
        const filePath = path.join(this.imagesDir, file);
        const stats = fs.statSync(filePath);
        return {
          id: file,
          name: file,
          path: `data/images/${file}`,
          uploadTime: fs.statSync(path.join(this.imagesDir, file)).mtime.toISOString(),
          timestamp: stats.mtime.getTime() // 添加时间戳用于排序
        }
      })
      .sort((a, b) => b.timestamp - a.timestamp) // 按时间戳倒序排序
      .map(({ timestamp, ...rest }) => rest); // 移除时间戳字段，只用于排序
  }

  // 删除文件
  deleteFile(filePath) {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  // 检查模块文件数量
  checkModuleFileLimit(module) {
    const moduleDir = path.join(this.uploadsDir, module);
    if (!fs.existsSync(moduleDir)) return true;

    const files = fs.readdirSync(moduleDir);
    return files.length < 8;
  }

  // 获取内容列表
  getContentList(module) {
    const moduleDir = path.join(this.uploadsDir, module);
    if (!fs.existsSync(moduleDir)) return [];

    const files = fs.readdirSync(moduleDir);
    return files
      .map(file => {
        const isActive = file.includes('_active');
        const originalName = this.extractOriginalName(file);
        const stats = fs.statSync(path.join(moduleDir, file));
        return {
          id: file,
          name: originalName,
          path: `data/uploads/${module}/${file}`,
          uploadTime: stats.mtime.toISOString(),
          status: isActive ? 'used' : 'unused',
          module,
          timestamp: stats.mtime.getTime() // 添加时间戳用于排序
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp) // 按时间戳倒序排序
      .map(({ timestamp, ...rest }) => rest); // 移除时间戳字段，只用于排序
  }

  // 设置内容为使用状态
  async setContentActive(filePath, module) {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      const dir = path.dirname(fullPath);
      const files = fs.readdirSync(dir);
      
      // 重置当前模块的所有文件状态
      files.forEach(file => {
        if (file.includes('_active')) {
          const oldPath = path.join(dir, file);
          const newName = file.replace('_active', '');
          const newPath = path.join(dir, newName);
          fs.renameSync(oldPath, newPath);
        }
      });

      const filename = path.basename(fullPath);
      if (!filename.includes('_active')) {
        const ext = path.extname(filename);
        const nameWithoutExt = filename.slice(0, -ext.length);
        const newName = `${nameWithoutExt}_active${ext}`;
        const newPath = path.join(dir, newName);
        fs.renameSync(fullPath, newPath);
        debug(ext);
        if (ext.toLowerCase() === '.xlsx' || ext.toLowerCase() === '.xls') {
          const result = await this.excelService.convertExcelToJson(newName, module);
          debug(result);
          return { success: result.success };
        }
      }
      return { success: true };
    }
    return { success: false };
  }

  // 从文件名中提取原始名称
  extractOriginalName(filename) {
    try {
      // 移除时间戳前缀和_active（如果存在）
      const ext = path.extname(filename);
      const nameWithoutExt = filename.slice(0, -ext.length);
      const parts = nameWithoutExt.split('_');
      
      // 如果最后一部分是'active'，则移除
      if (parts[parts.length - 1] === 'active') {
        parts.pop();
      }
      // 移除时间戳（第一个部分）
      parts.shift();
      
      // 重新组合文件名并确保编码正确
      const originalName = parts.join('_') + ext;
      return originalName;
    } catch (error) {
      console.error('Error extracting original name:', error);
      return filename;
    }
  }

  getMarkdownList() {
    try {
      const files = fs.readdirSync(this.markdownPath);
      return files
        .map(filename => {
          const filePath = path.join(this.markdownPath, filename);
          const stats = fs.statSync(filePath);
          return {
            path: `data/markdown/${filename}`,
            name: filename,
            uploadTime: stats.mtime.toISOString(),
            timestamp: stats.mtime.getTime() // 添加时间戳用于排序
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp) // 按时间戳倒序排序
        .map(({ timestamp, ...rest }) => rest); // 移除时间戳字段，只用于排序

    } catch (error) {
      console.error('获取 Markdown 列表失败:', error);
      return [];
    }
  }
}

module.exports = FileService; 