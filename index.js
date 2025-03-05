const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./config/config');
const FileService = require('./services/fileService');
const ExcelService = require('./services/excelService');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 初始化文件服务
const excelService = new ExcelService(config.paths.uploads);
const fileService = new FileService(config.paths.images, config.paths.uploads, excelService);
fileService.ensureDirectories();

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isImage = req.path.startsWith('/img/');
    cb(null, isImage ? config.paths.images : config.paths.uploads);
  },
  filename: function (req, file, cb) {
    // 解码文件名
    const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const timestamp = Date.now();
    const isImage = req.path.startsWith('/img/');
    
    if (isImage) {
      const ext = path.extname(originalname);
      cb(null, `${timestamp}${ext}`);
    } else {
      // 内容文件使用 时间戳_原始文件名 的格式
      cb(null, `${timestamp}_${originalname}`);
    }
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());

// 添加 hello 测试接口
app.get('/hello', (req, res) => {
  res.json({ message: 'world' });
});

// 静态文件服务
app.use('/data/images', express.static(config.paths.images));
app.use('/data/uploads', express.static(config.paths.uploads));
app.use('/data/json', express.static(config.paths.json));
app.use('/data/markdown', express.static(config.paths.markdown));

// 图片上传接口
app.post('/img/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '没有文件上传' });
    }

    const imgPath = `data/images/${req.file.filename}`;
    const imgClass = req.body.class;

    res.json({
      success: true,
      data: {
        path: imgPath,
        name: req.file.originalname,
        uploadTime: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 图片删除接口
app.get('/img/del', (req, res, next) => {
  try {
    const { path: filePath } = req.query;
    const success = fileService.deleteFile(filePath);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// 图片列表接口
app.get('/img/list', (req, res, next) => {
  try {
    const imageList = fileService.getImageList();
    res.json({ success: true, data: imageList });
  } catch (error) {
    next(error);
  }
});

// 内容上传接口
app.post('/content/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '没有文件上传' });
    }

    const module = req.body.module || 'banner';
    
    // 检查文件数量限制
    if (!fileService.checkModuleFileLimit(module)) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        error: '当前模块最多只能上传8个文件' 
      });
    }

    const moduleDir = path.join(config.paths.uploads, module);
    
    // 检查并创建模块目录
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }

    // 移动文件到对应模块目录
    const oldPath = req.file.path;
    const newPath = path.join(moduleDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    // 确保返回的文件名编码正确
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    res.json({ 
      success: true,
      data: {
        path: `data/uploads/${module}/${req.file.filename}`,
        name: originalname,
        uploadTime: new Date().toISOString(),
        module
      }
    });
  } catch (error) {
    next(error);
  }
});

// 内容使用接口
app.get('/content/use', (req, res, next) => {
  try {
    const { path: filePath, module } = req.query;
    fileService.setContentActive(filePath, module)
      .then(result => {
        res.json(result);
      })
      .catch(next);
  } catch (error) {
    next(error);
  }
});

// 内容列表接口
app.get('/content/list', (req, res, next) => {
  try {
    const module = req.query.module || 'banner';
    const contentList = fileService.getContentList(module);
    res.json({ success: true, data: contentList });
  } catch (error) {
    next(error);
  }
});

// 内容删除接口
app.get('/content/del', (req, res, next) => {
  try {
    const { path: filePath } = req.query;
    const success = fileService.deleteFile(filePath);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// Markdown 上传接口
app.post('/markdown/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '没有文件上传' });
    }

    const markdownDir = config.paths.markdown;
    
    // 检查并创建 markdown 目录
    if (!fs.existsSync(markdownDir)) {
      fs.mkdirSync(markdownDir, { recursive: true });
    }

    // 移动文件到 markdown 目录
    const oldPath = req.file.path;
    const newPath = path.join(markdownDir, req.file.filename);
    fs.renameSync(oldPath, newPath);

    // 确保返回的文件名编码正确
    const originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    res.json({
      success: true,
      data: {
        path: `data/markdown/${req.file.filename}`,
        name: originalname,
        uploadTime: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Markdown 删除接口
app.get('/markdown/del', (req, res, next) => {
  try {
    const { path: filePath } = req.query;
    const success = fileService.deleteFile(filePath);
    res.json({ success });
  } catch (error) {
    next(error);
  }
});

// Markdown 列表接口
app.get('/markdown/list', (req, res, next) => {
  try {
    const markdownList = fileService.getMarkdownList();
    res.json({ success: true, data: markdownList });
  } catch (error) {
    next(error);
  }
});

// 错误处理中间件
app.use(errorHandler);

const PORT = config.server.port;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 