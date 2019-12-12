const fs = require('fs');
const unzip = require('unzip');
const FILE_FORM_MASK = '_379_Q_G_01.ZIP'; //Как показывае приктика эта строка содержится во всех необходимых нам файлах.
const RECURSION_COUNT = 2; //Максимальная глубина погружения в рекурсию. При моей структуре папок хватит одного погружения.
const OFFSET = 48; //В файле хранятся коды символов, но мне удобнее работать со стандартными номерами КФО. Для конвертации используем эту константу.
const path = process.argv[2];

if (!path) {
    console.log('Не задан путь к каталогу с файлами!');
    process.exit(1);
}

function isPointKFO(arr, item) { //Определяем, является ли эта строка стокой с номером КФО. Должна начинаться с "КВД=".
    return ((arr[item] == 202) && (arr[item + 1] == 194) && (arr[item + 2] == 196) && (arr[item + 3] == 61)); 
}

function isExcessString(arr, item, KFO) { //Проверка на нужность строки. Строка лишняя если она описывает КФО или содержит данные по КФО, но ма создаем файл по другому КФО.
    return ((isPointKFO(arr[item], 0) && arr[item][4] !== KFO + OFFSET) || (~[49, 50, 51, 52, 53, 54, 55].indexOf(arr[item][0]) && arr[item][0] !== KFO + OFFSET));
}

function getNewFiles(path, fileName) { //Чтение исходного файла и создание новых файлов на его основе.
    fs.createReadStream(path + '/' + fileName).pipe(unzip.Parse()).on('entry', function (entry) {
        entry.on('data', function (chunk) {
            let data = chunk.toJSON().data; //Преобразуем данные в массив. Так их легче обработать.
            let arrKFO = []; //массив, в котором мы будем хранить виды КФО найденные в отчете.
            let arrData = [];
            let arrStart = 0; //Указатель на начало текущей строки.
            //Разобъем данные на строки, преобразуем каждую в Buffer и сложим в массив. В дальнейшем мы сможем решать, нужна ли нам строка, и если нет, то просто удалим её из массива.
            for (let i = 0; i < data.length; i++) {
                if (chunk[i] == 10) { // 10 - конец строки
                    if (isPointKFO(data, i + 1)) { //Если эта строка - строка с описанием КФО, то получем КФО (5 элемент в строка), и записываем его в массив найденных КФО.
                        arrKFO.push(data[i + 5] - OFFSET);
                    }
                    arrData.push(new Buffer.from(data.slice(arrStart, (i + 1))));
                    arrStart = i + 1; //Обновим указатель. Пусть указывает на новую строку.
                }
            }
            for (let n = 0; n < arrKFO.length; n++) { //Создаем новый файл для каждого КФО.
                let newData = arrData.slice();
                for (let i = 0; i < newData.length; i++) {
                    if (isExcessString(newData, i, arrKFO[n])) { //Проверяем, не является ли эта строка лишней для данного КФО. Если лишняя - удалим её из массива.
                        newData.splice(i--, 1);
                    }
                }
                fs.createWriteStream(path + '/379Q01_' + arrKFO[n] + '.txt').end(new Buffer.concat(newData)); //Записываем наш массив буферов в файл.
            }
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
                    getNewFiles(path, files[i].name);
                }
            }
        }
    });
}

readDir(path, 0);
