const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');

class ExcelService {
  constructor(uploadsDir) {
    this.uploadsDir = uploadsDir;
    this.jsonDir = config.paths.json;
  }

  excelToJson(exceljson) {
    try {
      // 按type分组处理数据
      const result = exceljson.reduce((acc, row) => {
        const { ...rest } = row;
        
        // 处理所有值，将undefined和null转换为空字符串
        const processedRow = Object.entries(rest).reduce((obj, [key, value]) => {
          obj[key] = value ?? '';
          return obj;
        }, {});
        
        // 将处理后的数据添加到对应type的数组中
        acc.push(processedRow);
        
        return acc;
      }, []);
      
      return result;
      
    } catch (error) {
      console.error('转换过程中出现错误:', error);
      return null;
    }
  }

  /**
   * 将Excel文件转换为JSON并保存
   * @param {string} filename - Excel文件名（包含时间戳和active标记）
   * @param {string} module - 模块名
   * @returns {Object} 转换结果
   */
  async convertExcelToJson(filename, module) {
    try {
      const excelPath = path.join(this.uploadsDir, module, filename);
      const workbook = xlsx.readFile(excelPath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const jsonData = xlsx.utils.sheet_to_json(worksheet);
      const res = this.excelToJson(jsonData);

      // 使用模块名称作为JSON文件名
      const jsonFilename = `${module}.json`;
      const jsonPath = path.join(this.jsonDir, module, jsonFilename);

      // 如果文件已存在，先删除旧文件
      if (fs.existsSync(jsonPath)) {
        fs.unlinkSync(jsonPath);
      }

      // 保存新的JSON文件
      fs.writeFileSync(jsonPath, JSON.stringify(res, null, 2));

      return { success: true };
    } catch (error) {
      console.error('Excel conversion error:', error);
      return { success: false };
    }
  }
}

module.exports = ExcelService; 