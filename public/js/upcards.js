/* eslint-disable */
var $ = jQuery;
var $list = $('#fileList');
// 优化retina; 在retina下这个值是2
var ratio = window.devicePixelRatio || 1;

// 缩略图大小
var thumbnailWidth = 100 * ratio;
var thumbnailHeight = 100 * ratio;

// 初始化Web Uploader
var uploader = WebUploader.create({
  // 自动上传。
  auto: true,

  // swf文件路径
  swf: 'http://cdn.staticfile.org/webuploader/0.1.5/Uploader.swf',

  // 文件接收服务端。
  server: '/upcards',

  // 选择文件的按钮。可选。
  // 内部根据当前运行是创建，可能是input元素，也可能是flash.
  pick: '#filePicker',

  // 只允许选择文件，可选。
  accept: {
    title: 'XLS',
    extensions: 'xls',
    mimeTypes: 'application/vnd.ms-office'
  }
});

// 当有文件添加进来的时候
uploader.on('fileQueued', function(file) {
  var $li = $(
      '<div id="' + file.id + '" class="file-item thumbnail">' +
      '<img>' +
      '<div class="info">' + file.name + '</div>' +
      '</div>'
    ),
    $img = $li.find('img');

  $list.append( $li );

  $img.attr( 'src', '/img/xls.png' );
});

// 文件上传过程中创建进度条实时显示。
uploader.on('uploadProgress', function(file, percentage) {
  var $li = $('#' + file.id);
  var $percent = $li.find('.progress span');

  // 避免重复创建
  if (!$percent.length) {
    $percent = $('<p class="progress"><span></span></p>')
      .appendTo( $li )
      .find('span');
  }

  $percent.css('width', percentage * 100 + '%');
});

// 文件上传成功，给item添加成功class, 用样式标记上传成功。
uploader.on('uploadSuccess', function(file) {
  $( '#' + file.id ).addClass('upload-state-done');
});

uploader.on('uploadAccept', function(file, response) {
  // 通过return false来告诉组件，此文件上传有错。
  if (response.errcode) {
    return false;
  }

  window.UPLOAD_NETCARDS = window.UPLOAD_NETCARDS || [];

  window.UPLOAD_NETCARDS.push(response);

  console.log(response);
});

// 文件上传失败，现实上传出错。
uploader.on('uploadError', function(file) {
  var $li = $( '#' + file.id );
  var $error = $li.find('div.error');

  // 避免重复创建
  if (!$error.length) {
    $error = $('<div class="error"></div>').appendTo($li);
  }

  $error.text('上传失败');
});

// 完成上传完了，成功或者失败，先删除进度条。
uploader.on('uploadComplete', function(file) {
  $( '#' + file.id ).find('.progress').remove();
});

$(function () {
  $('#confirm').on('click', function () {
    var statistics = {
      20: 0,
      30: 0,
      50: 0
    };

    var batches = [];
    var uploadNetcards = window.UPLOAD_NETCARDS || [];
    uploadNetcards.forEach(function (batch) {
      statistics['20'] += batch['20'];
      statistics['30'] += batch['30'];
      statistics['50'] += batch['50'];
    });

    var confirmStr = "本次上传20元网票：" + statistics['20'] + "张\n"
      + "上传30元网票：" + statistics['30'] + "张\n"
      + "上传50元网票：" + statistics['50'] + "张\n"
      + "请输入确认密钥"
    var key = prompt(confirmStr);

    if (key) {
      var postData = {
        key: key,
        batches: uploadNetcards
      };

      $.post('/upcards/confirm', postData, function (data) {
        if (data.errcode) {
          alert(data.errmsg);
        } else {
          alert(JSON.stringify(data.result));
          window.location.reload();
        }
      });
    } else {
      alert('请输入上传密钥');
    }
  });
});
