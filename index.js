const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const FileService = require('./services/fileService');
const errorHandler = require('./middleware/errorHandler');
const ExcelService = require('./services/excelService');

const app = express();

// 初始化文件服务
const dataDir = path.join(__dirname, '../data');
const imagesDir = path.join(dataDir, 'images');
const uploadsDir = path.join(dataDir, 'uploads');
const excelService = new ExcelService(uploadsDir);
const fileService = new FileService(imagesDir, uploadsDir, excelService);
fileService.ensureDirectories();

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isImage = req.path.startsWith('/img/');
    cb(null, isImage ? imagesDir : uploadsDir);
  },
  filename: function (req, file, cb) {
    const timestamp = Date.now();
    const isImage = req.path.startsWith('/img/');
    if (isImage) {
      const ext = path.extname(file.originalname);
      cb(null, `${timestamp}${ext}`);
    } else {
      // 内容文件使用 时间戳_原始文件名 的格式
      cb(null, `${timestamp}_${file.originalname}`);
    }
  }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
// 静态文件服务
app.use('/data/images', express.static(imagesDir));
app.use('/data/uploads', express.static(uploadsDir));
app.use('/data/json', express.static(path.join(dataDir, 'json')));

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
    res.json({ 
      success: true,
      data: {
        path: `data/uploads/${req.file.filename}`,
        name: req.file.originalname,
        uploadTime: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// 内容使用接口
app.get('/content/use', (req, res, next) => {
  try {
    const { path: filePath } = req.query;
    fileService.setContentActive(filePath)
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
    const contentList = fileService.getContentList();
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

// 错误处理中间件
app.use(errorHandler);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 