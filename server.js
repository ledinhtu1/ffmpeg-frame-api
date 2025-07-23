const express = require('express');
const axios = require('axios');
const fs = require('fs');
const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

app.post('/extract-frame', async (req, res) => {
  const { video_url, timecode } = req.body;

  if (!video_url || !timecode) {
    return res.status(400).send('Missing parameters');
  }

  const id = uuidv4();
  const inputPath = `/tmp/${id}.mp4`;
  const outputPath = `/tmp/${id}.jpg`;

  try {
    const response = await axios({ method: 'GET', url: video_url, responseType: 'stream' });
    const writer = fs.createWriteStream(inputPath);

    response.data.pipe(writer);

    writer.on('finish', () => {
      const cmd = `ffmpeg -ss ${timecode} -i ${inputPath} -frames:v 1 ${outputPath}`;
      exec(cmd, (err) => {
        if (err) return res.status(500).send('FFmpeg error');

        const image = fs.readFileSync(outputPath);
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        res.end(image);
      });
    });

    writer.on('error', () => {
      res.status(500).send('File write error');
    });

  } catch (error) {
    res.status(500).send('Download or processing error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`FFmpeg API is running on port ${PORT}`));
