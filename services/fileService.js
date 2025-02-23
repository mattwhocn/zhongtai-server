const fs = require('fs');
const path = require('path');

class FileService {
  constructor(imagesDir, uploadsDir, excelService) {
    this.imagesDir = imagesDir;
    this.uploadsDir = uploadsDir;
    this.jsonDir = path.join(__dirname, '../../data/json'); // 添加 JSON 目录
    this.excelService = excelService;  // 注入ExcelService
  }

  // 确保目录存在
  ensureDirectories() {
    [this.imagesDir, this.uploadsDir, this.jsonDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  // 获取图片列表
  getImageList() {
    const files = fs.readdirSync(this.imagesDir);
    return files.map(file => ({
      id: file,
      name: file,
      path: `data/images/${file}`,
      uploadTime: fs.statSync(path.join(this.imagesDir, file)).mtime.toISOString()
    }));
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

  // 获取内容列表
  getContentList() {
    const files = fs.readdirSync(this.uploadsDir);
    return files.map(file => {
      const isActive = file.includes('_active');
      // 从文件名中提取原始名称
      const originalName = this.extractOriginalName(file);
      return {
        id: file,
        name: originalName,
        path: `data/uploads/${file}`,
        uploadTime: fs.statSync(path.join(this.uploadsDir, file)).mtime.toISOString(),
        status: isActive ? 'used' : 'unused'
      };
    });
  }

  // 设置内容为使用状态并转换Excel
  async setContentActive(filePath) {
    const fullPath = path.join(__dirname, '../..', filePath);
    if (fs.existsSync(fullPath)) {
      // 先重置所有文件状态
      const dir = path.dirname(fullPath);
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file.includes('_active')) {
          const oldPath = path.join(dir, file);
          const newName = file.replace('_active', '');
          const newPath = path.join(dir, newName);
          fs.renameSync(oldPath, newPath);
        }
      });

      // 设置当前文件为active
      const filename = path.basename(fullPath);
      if (!filename.includes('_active')) {
        const ext = path.extname(filename);
        const nameWithoutExt = filename.slice(0, -ext.length);
        const newName = `${nameWithoutExt}_active${ext}`;
        const newPath = path.join(dir, newName);
        fs.renameSync(fullPath, newPath);

        // 转换新激活的Excel文件
        if (ext.toLowerCase() === '.xlsx' || ext.toLowerCase() === '.xls') {
          const result = await this.excelService.convertExcelToJson(newName);
          return { success: result.success };
        }
      }
      return { success: true };
    }
    return { success: false };
  }

  // 从文件名中提取原始名称
  extractOriginalName(filename) {
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
    
    // 重新组合文件名
    return parts.join('_') + ext;
  }
}

module.exports = FileService; 