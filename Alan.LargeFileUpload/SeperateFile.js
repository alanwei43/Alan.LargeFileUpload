/// <reference path="E:\Projects\Alan.LargeFileUpload\Alan.LargeFileUpload\jquery-1.11.2.js" />

/*
 * Author: Alan Wei
 * Email: Alan.Wei@live.com
 * Github: https://github.com/Allen-Wei/Alan.LargeFileUpload
 * 
 * Description: 使用Javascript分割文件, 实现分块异步的断点续传上传功能.
 */

(function () {


    /*
     * 
     * @param file: File对象
     * @param userOptions:{
     *      start: 文件上传开始, 
     *      send: 发送数据, 
     *      sending: 正在发送数据, 
     *      sent: 数据发送完成, 
     *      finish: 文件上传结束, 
     *      error: 文件上传出错,
     *      blockSize: 每次上传的数据量大小(单位byte)
     * }
     * @returns {
     *      continueSeperate: 断点续传
     * } 
     */
    window.SeperateFile = function (file, userOptions) {
        if (!file || !file.name || !file.size || !file.slice) {
            throw "invalid file";
        }

        var reader = new FileReader();

        var options = {
            start: function () {
                $("body").trigger("fuStart.fileupload");
            },
            send: function (queue, queues) {
                $("body").trigger("fuSend.fileupload", [queue, queues]);
                var deferred = $.Deferred();
                deferred.resolve();
                return deferred.promise();
            },
            sending: function (queue, queues) {
                $("body").trigger("fuSending.fileupload", [queue, queues]);
            },
            sent: function (queue, queues) {
                $("body").trigger("fuSent.fileupload", [queue, queues]);
            },
            finish: function (queues) {
                $("body").trigger("fuFinish.fileupload", [queues]);
            },
            error: function () { }
        };

        var uploadConfig = {
            totalSize: file.size,
            blockSize: 100 * 1024,
            timeOut: 100,
            queues: [
                {
                    start: 0,
                    end: NaN,
                    status: 'unsend',
                    data: undefined
                }
            ]
        };

        if (userOptions) {
            $.extend(options, userOptions);
            uploadConfig.blockSize = userOptions.blockSize || uploadConfig.blockSize;
        }


        if (uploadConfig.totalSize <= 0) {
            throw "Uplaod file size <= 0";
        }

        (function () {
            //initial first queue
            var firstQueue = {
                start: 0,
                end: NaN,
                status: 'unsend',
                data: undefined
            };
            firstQueue.end = firstQueue.start + uploadConfig.blockSize;
            firstQueue.end = firstQueue.end > uploadConfig.totalSize ? uploadConfig.totalSize : firstQueue.end;
            uploadConfig.queues[0] = firstQueue;
        })();


        var interval = function () {

            var lastQueue = uploadConfig.queues[uploadConfig.queues.length - 1]; //last queue

            if (lastQueue.end > uploadConfig.totalSize) {
                options.finish(uploadConfig.queues);
                return;
            }
            if (lastQueue.status === 'unsend') {
                //lastQueue unsend
                lastQueue.status = 'sending'; //change last queue status to sending
                var block = file.slice(lastQueue.start, lastQueue.end);
                reader.readAsDataURL(block);
                reader.onload = function () {
                    var base64 = reader.result.split(',')[1];
                    lastQueue.data = base64;
                    var promise = options.send(lastQueue, uploadConfig.queues);
                    promise.then(function () {
                        lastQueue.status = 'sent';
                        setTimeout(interval, uploadConfig.timeOut);
                    }, function () {
                        lastQueue.status = 'unsend';
                        options.error(lastQueue);
                    });
                };
            }
            if (lastQueue.status === 'sending') {
                //lastQueue正在发送
                options.sending(lastQueue, uploadConfig.queues);
            }
            if (lastQueue.status === 'sent') {
                //lastQueue已经发送
                if (lastQueue.end >= uploadConfig.totalSize) {
                    options.finish(uploadConfig.queues);
                    return;
                }

                var endSize = lastQueue.end + uploadConfig.blockSize;
                endSize = endSize > uploadConfig.totalSize ? uploadConfig.totalSize : endSize;

                uploadConfig.queues.push({
                    start: lastQueue.end,
                    end: endSize,
                    status: 'unsend'
                });
                options.sent(lastQueue, uploadConfig.queues);
                setTimeout(interval, uploadConfig.timeOut);
            }
        };

        options.start();
        setTimeout(interval, uploadConfig.timeOut);

        var utils = {
            //Continue upload
            continueSeperate: function () {
                setTimeout(interval, uploadConfig.timeOut);
            },
            getQueues: function () {
                return uploadConfig.queues;
            }
        };
        return utils;
    };


})();
