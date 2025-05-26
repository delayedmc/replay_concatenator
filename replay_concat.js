const extract = require('extract-zip')
const archiver = require('archiver');
const fs = require('fs').promises; 
const path = require('path'); 
const { spawn } = require('child_process');


const camera_data_path = "./camera_data.json";
const output_settings = "./output_settings.json";
const settings_file = "./settings.json";
const input_dir = "./input";
const output_dir = "./output";
const tmp_dir = "./tmp";
const run_dir = path.join(__dirname, "run");


async function main(){
    await deleteFolderRecursive(tmp_dir);
    await deleteFolderRecursive(output_dir);

    const settings_txt = await fs.readFile(settings_file);
    const settings = JSON.parse(settings_txt);
    const output_render_dir = settings.output_render_dir;

    await deleteFolderRecursive(run_dir);

    const raw_mcpr_array = await fs.readdir(input_dir);
    const camera_data_raw = await fs.readFile(camera_data_path);
    const camera_data = JSON.parse(camera_data_raw);
    const output_settings_txt = await fs.readFile(output_settings);
    const out_settings = JSON.parse(output_settings_txt);

    const length = camera_data[Object.keys(camera_data)[0]][camera_data[Object.keys(camera_data)[0]].length - 1]['keyframes'].length - 1;
    const max_cinematic_length = camera_data[Object.keys(camera_data)[0]][camera_data[Object.keys(camera_data)[0]].length - 1]['keyframes'][length].time
    
    let total_duration = 0;
    let replay_data = {};

    for (let i = 0; i < raw_mcpr_array.length; i++) {
        const raw_mcpr = raw_mcpr_array[i];

        if(!raw_mcpr.includes("mcpr")) continue;

        const zip_file = raw_mcpr.replace("mcpr", "zip")
        const extract_dir = path.join(run_dir, raw_mcpr.split(".")[0]);

        await fs.copyFile(path.join(input_dir, raw_mcpr), path.join(tmp_dir, zip_file));  
        
        if(await !checkFileExists(extract_dir)){
            await fs.mkdir(extract_dir);
        }

        await extractZip(path.join(tmp_dir, zip_file), extract_dir);
    }

    let extracted_folders = await fs.readdir(run_dir);
    extracted_folders = extracted_folders.sort((a,b) => ("" + a).localeCompare(b, undefined, {numeric: true}));
    for (let i = 0; i < extracted_folders.length; i++) {
        const folder = extracted_folders[i];
        
        let data = await fs.readFile(path.join(run_dir, folder, "metaData.json"))
        data = JSON.parse(data);

        total_duration += data.duration;
    }

    for (let i = 0; i < extracted_folders.length; i++) {
        const folder = extracted_folders[i];
        
        let data = await fs.readFile(path.join(run_dir, folder, "metaData.json"))
        data = JSON.parse(data);

        replay_data[folder] = {
            name: folder,
            percentage: (100 * data.duration) / total_duration,
            duration: data.duration
        }
    }

    await deleteFolderRecursive(tmp_dir);

    replay_data = sortObjectKeys(replay_data)

    let previous_length = 0;
    let index = 0;

    console.log(replay_data);

    for (values of Object.values(replay_data)) {
        index++;
        
        console.log(index, values.name);

        const time_data = 
        {
            "keyframes": [
              { "time": previous_length, "properties": { "timestamp": 0 } },
              { "time": parseInt((values.percentage / 100) * max_cinematic_length) + previous_length, "properties": { "timestamp": values.duration } }
            ],
            "segments": [0],
            "interpolators": [{ "type": "linear", "properties": ["timestamp"] }]
        }

        previous_length = previous_length + parseInt(((values.percentage / 100) * max_cinematic_length) + 1);

        let output_data = JSON.parse(JSON.stringify(camera_data));
        output_data[Object.keys(output_data)[0]].unshift(time_data);
        let key = Object.keys(output_data)[0];

        // await fs.writeFile(path.join(output_dir, `${settings.base_name + "_" + index}.txt`), JSON.stringify(output_data));
       
        if(settings.use_python_zip) continue;

        output_data = removeLineBreakes(JSON.stringify(output_data));
        output_data = output_data.replace(key, "")
        output_data = output_data.replaceAll(`"`, `\"`);

        let render_settings = {timeline: output_data, ...out_settings};
        render_settings.settings.outputFile = path.join(output_render_dir, `${settings.base_name}_${index}.mp4`);

       
        await fs.writeFile(path.join(run_dir, values.name, `renderQueue.json`), JSON.stringify([render_settings]));

        const output = require("fs").createWriteStream(path.join(tmp_dir, values.name + ".zip"));
        const archive = archiver('zip', {
        zlib: { level: 9 }
        });

        await output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        });
        
        await archive.on('error', function(err){
            throw err;
        });

        await archive.pipe(output);
        await archive.directory(path.join(run_dir, values.name), false);
        await archive.finalize();

        await sleep(100);

        await fs.copyFile(path.join(tmp_dir, values.name + ".zip"), path.join(output_dir, settings.base_name + "_" + index + ".mcpr"));  
    }   

    if(settings.use_python_zip){
        await compressWithPython();
    }
}

main();

function sortObjectKeys(obj) {
    let sorted_object = {};

    let keys = Object.keys(obj)
    keys = keys.sort((a,b) => ("" + a).localeCompare(b, undefined, {numeric: true}));

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        
        sorted_object[key] = obj[key];
    }

    return sorted_object;
}

async function extractZip(src, dest) {
  try {
    await extract(src, { dir: dest });
  } catch (err) {
    console.log(err)
  }
}

async function checkFileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') {
            return false;
        } else {
            throw error;
        }
    }
}

function removeLineBreakes(text) {
    return text.replaceAll(/[\r\n]+/gm, '');
}

async function deleteFolderRecursive(folderPath) {
    try {
        const files = await fs.readdir(folderPath);

        for (const file of files) {
            const curPath = path.join(folderPath, file);
            const stat = await fs.lstat(curPath);

            if (stat.isDirectory()) {
                await deleteFolderRecursive(curPath);
                await fs.rmdir(curPath);
            } else {
                await fs.unlink(curPath);
            }
        }

        // console.log(`"${folderPath}" content was deleted.`);
    } catch (err) {
        console.error(`Error when cleaning folder "${folderPath}":`, err);
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function compressWithPython() {
  return new Promise((resolve, reject) => {
    const processo = spawn('python', ['conv_zip.py']);

    let result = '';
    let error = '';

    processo.stdout.on('data', (data) => {
      result += data.toString();
    });

    processo.stderr.on('data', (data) => {
      error += data.toString();
    });

    processo.on('close', (code) => {
      if (code === 0) {
        resolve(result.trim());
      } else {
        reject(new Error(`Error: ${code}\n${error}`));
      }
    });
  });
}
