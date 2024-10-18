require('dotenv').config();

const express = require('express');

const cors = require('cors');

const app = express();

const dns = require('dns');

const bodyParser = require('body-parser');

const mongoose = require('mongoose');

const shortid = require('shortid'); // 用于生成短链接 ID

// Basic Configuration

const port = process.env.PORT || 3000;


app.use(cors());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.urlencoded({ extended: false }));

app.use(bodyParser.json());

// 定义 URL 模型

const urlSchema = new mongoose.Schema({

  original_url: { type: String, required: true },

  short_url: { type: String, required: true }
});

const Url = mongoose.model('Url', urlSchema);

// 创建短链接

app.post('/api/shorturl', async (req, res) => {

  const { url: inputUrl } = req.body;

  // 验证输入是否为有效字符串

  if (typeof inputUrl !== 'string' || inputUrl.trim() === '') {

    return res.json({ error: 'invalid url' });

  }

  try {

    // 解析 URL 并提取主机名

    const parsedUrl = new URL(inputUrl);

    const hostname = parsedUrl.hostname;

    // 验证 URL 格式

    if (!/^https?:\/\//.test(inputUrl)) {

      return res.json({ error: 'invalid url' });

    }

    dns.lookup(hostname, async (err) => {
      if (err) {

        return res.json({ error: 'invalid url' });
      }

      // 检查是否已存在相同的 URL

      let urlEntry = await Url.findOne({ original_url: inputUrl });

      if (!urlEntry) {

        // 创建新的短链接

        const shortUrl = shortid.generate();

        urlEntry = new Url({ original_url: inputUrl, short_url: shortUrl });

        await urlEntry.save();

      }


      res.json({ original_url: urlEntry.original_url, short_url: urlEntry.short_url });

    });

  } catch (error) {

    return res.json({ error: 'invalid url' });

  }

});

// 重定向到原始 URL

app.get('/api/shorturl/:short_url', async (req, res) => {

  const { short_url } = req.params;

  const urlEntry = await Url.findOne({ short_url });

  if (!urlEntry) {

    return res.status(404).json({ error: 'No short URL found for the given input' });

  }


  res.redirect(urlEntry.original_url);

});

// 静态文件和首页

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {

  res.sendFile(process.cwd() + '/views/index.html');

});


// 测试 API

app.get('/api/hello', function(req, res) {

  res.json({ greeting: 'hello API' });

});

// 启动服务器

app.listen(port, function() {

  console.log(`Listening on port ${port}`);

});


