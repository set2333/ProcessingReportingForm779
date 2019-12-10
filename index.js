const fs = require('fs');
const unzip = require('unzip');
const FILE_FORM_MASK = '_379_Q_G_01.ZIP'; //Как показывае приктика эта строка содержится во всех необходимых нам файлах.
const RECURSION_COUNT = 2; //Максимальная глубина погружения в рекурсию. При моей структуре папок хватит одного погружения.
const path = process.argv[2];

if (!path) {
    console.log('Не задан путь к каталогу с файлами!');
    process.exit(1);
}

function getNewFiles(path) { //Чтение исходного файла и создание новых файлов на его основе.
    fs.createReadStream(path).pipe(unzip.Parse()).on('entry', function(entry) {
        entry.on('entry', function(chunk) {
            console.log('!!!!!');
            console.log(chunk.toString('utf8'));
        });
    });
}

function readDir(path, rec_count) { //Обход директорий и поиск нужных файлов.
    fs.readdir(path, {
        withFileTypes: true
    }, function (err, files) {
        if (err) {
            return console.log(err);
        }
        for (let i = 0; i < files.length; i++) {
            if (files[i].isDirectory() && rec_count < RECURSION_COUNT) {
                setImmediate(() => readDir(path + '/' + files[i].name), rec_count + 1); //В принципе асинхронность здесь не нужна, но приложение пишется в тренировочных целях, так что пусть будет.
            } else {
                if (~files[i].name.indexOf(FILE_FORM_MASK)) { //Проверка на вхождение маски в имя файла.
                    getNewFiles(path + '/' + files[i].name);
                }
            }
        }
    });
}

readDir(path, 0);
