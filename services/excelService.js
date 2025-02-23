const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelService {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir;
    this.jsonDir = path.join(__dirname, '../../data/json');
  }

  excelToJson(exceljson) {
    try {
      // 按type分组处理数据
      const result = exceljson.reduce((acc, row) => {
        const { type, ...rest } = row;
        
        // 确保type存在
        if (!type) return acc;
        
        // 如果该type还没有数组，则创建一个
        if (!acc[type]) {
          acc[type] = [];
        }
        
        // 处理所有值，将undefined和null转换为空字符串
        const processedRow = Object.entries(rest).reduce((obj, [key, value]) => {
          obj[key] = value ?? '';
          return obj;
        }, {});
        
        // 将处理后的数据添加到对应type的数组中
        acc[type].push(processedRow);
        
        return acc;
      }, {});
      
      return result;
      
    } catch (error) {
      console.error('转换过程中出现错误:', error);
      return null;
    }
  }

  /**
   * 将Excel文件转换为JSON并保存
   * @param {string} filename - Excel文件名（包含时间戳和active标记）
   * @returns {Object} 转换结果
   */
  async convertExcelToJson(filename) {
    try {
      const excelPath = path.join(this.uploadsDir, filename);
      const workbook = xlsx.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 转换为JSON数据
      const jsonData = xlsx.utils.sheet_to_json(worksheet);

      const res = this.excelToJson(jsonData)
      // 生成JSON文件名（使用与Excel相同的时间戳）
      const timestamp = filename.split('_')[0];
      const jsonFilename = `${timestamp}_data.json`;
      const jsonPath = path.join(this.jsonDir, jsonFilename);

      // 保存JSON文件
      fs.writeFileSync(jsonPath, JSON.stringify(res, null, 2));

      return { success: true };
    } catch (error) {
      console.error('Excel conversion error:', error);
      return { success: false };
    }
  }
}

module.exports = ExcelService; 