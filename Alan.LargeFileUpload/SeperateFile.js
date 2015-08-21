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
     * 
     * 
     */
    window.SeperateFile = function (file, userOptions) {

        if (!file || !file.name || !file.size || !file.slice) {
            //第一个参数必须拥有name, size属性和slice方法
            //JavaScript默认的File对象满足这个要求.
            //这个地方这么写(没有强制要求是JavaScript的File对象)的好处是你自己可以封装一个类似于File对象的东西.
            throw "invalid file";
        }

        var reader = new FileReader();

        /*
         * options 里的start, sending, sent, finish, error事件 默认实现是出发相应body事件(PubSub模式), 这样的好处是可以在多个地方监听相应事件.  当然你也可以重写这几个方法.
         * 
         * 事件的命名采用了jQuery的事件命名空间, 你可以 $("body").off(".fileupload") 注销下面的所有事件.
         */
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
            error: function (queues) {
                $("body").trigger("fuError.fileupload", [queues]);
            }
        };

        var uploadConfig = {
            totalSize: file.size,
            blockSize: 100 * 1024,
            timeOut: 100,
            queues: [{
                /*
                 * 这个就是数据队列了
                 * 数据队列是按顺序将file对象的分割填充进去的
                 * 只有最后一块数据发送成功之后, 才开始填充下一块数组
                 * 
                 * start: 数据块的开始位置
                 * end: 数据块的结束位置
                 * status: 数据块的发送状态, unsend: 未发送, sending: 正在发送, sent: 已发送
                 * data: 是一个base64格式的数据
                 */
                start: 0,
                end: NaN,
                status: 'unsend',
                data: undefined
            }]
        };

        if (userOptions) {
            //覆盖默认配置
            $.extend(options, userOptions);
            uploadConfig.blockSize = userOptions.blockSize || uploadConfig.blockSize;
        }


        if (uploadConfig.totalSize <= 0) {
            throw "Uplaod file size <= 0";
        }

        (function () {
            //初始化第一个数据块
            var firstQueue = {
                start: 0,
                end: NaN,
                status: 'unsend',
                data: undefined
            };
            //如果file.size <= blockSize, 第一个数据块的结束位置就为file.size
            firstQueue.end = firstQueue.start + uploadConfig.blockSize;
            firstQueue.end = firstQueue.end > uploadConfig.totalSize ? uploadConfig.totalSize : firstQueue.end;
            uploadConfig.queues[0] = firstQueue;
        })();

        //1: 发送队列中的unsend数据块
        //2: 发送成功后填充下一个数据块
        //回到1
        var interval = function () {

            var lastQueue = uploadConfig.queues[uploadConfig.queues.length - 1]; //last queue

            if (lastQueue.end > uploadConfig.totalSize) {
                options.finish(uploadConfig.queues);
                return;
            }
            if (lastQueue.status === 'unsend') {
                //发送 unsend 数据块(lastQueue)
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

                //填充下一个数据块
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
