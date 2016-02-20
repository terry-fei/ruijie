/* eslint-disable */
function getQuerys() {
  var url = location.search; //获取url中"?"符后的字串
  var theRequest = {};
  if (url.indexOf("?") != -1) {
    var str = url.substr(1);
    if (str.indexOf("&") != -1) {
      strs = str.split("&");
      for (var i = 0; i < strs.length; i++) {
        theRequest[strs[i].split("=")[0]] = unescape(strs[i].split("=")[1]);
      }
    } else {
      theRequest[str.split("=")[0]] = unescape(str.split("=")[1]);
    }
  }
  return theRequest;
}

function closeWindow() {
  WeixinJSBridge.invoke('closeWindow', {}, function(res){});
}

$(function () {
  var query = getQuerys();
  $('#chargeBtn').click(function () {
    var stuid = $("#stuid").val();
    var pswd = $("#pswd").val();

    if(!stuid) {
      $.weui.topTips('请输入学号');
      $("#stuid").focus();
      return;
    }

    if(!pswd) {
      $.weui.topTips('请输入校园网密码');
      $("#pswd").focus();
      return;
    }

    $.weui.loading('正在充值...');

    query.stuid = stuid;
    query.pswd = pswd;

    $.post('/charge', query, function (data) {
      $.weui.hideLoading();
      if (data.errcode !== 0) {
        var alertMsg = data.errmsg;
        if (data.errcode === 4) {
          alertMsg += ('<center>充值账户</center><br><center>' + data.chargeFor + '</center>');
        }

        if (data.errcode === 7) {
          var pswd = $("#pswd").val('');
        }

        $.weui.alert(data.errmsg, function () {});
        return;
      }

      if (data.hasFailed) {
        $.weui.alert('充值异常，请重试，如多次尝试仍失败，请申诉', function () {});
      } else {
        $.weui.alert('<center>充值成功</center><br><center>金额：' + data.successValue + '元</center>', closeWindow);
      }
    });
  });
});
