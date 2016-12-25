(function() {
    var freq = 13333;
    var ctx;
    var signal;

    var AudioContext = window.AudioContext || window.webkitAudioContext;

    function schedule(date) {
        var now = Date.now();
        var start = date.getTime();
        var offset = (start - now) / 1000 + ctx.currentTime;
        var minute = date.getMinutes();
        var hour = date.getHours();
        var year = date.getFullYear() % 100;
        var week_day = date.getDay();
        var year_day = (new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (24*60*60*1000) + 1;
        var array = [];

        // 毎分s秒の位置のマーカーを出力する
        function marker(s) {
            array.push(0.2);
            var t = s + offset;
            if (t < 0) return;
            var osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.value = freq;
            osc.start(t);
            osc.stop(t + 0.2);
            osc.connect(ctx.destination);
        }

        // パリティービット
        var pa;

        // bitを出力する
        function bit(s, value, weight) {
            var b = value >= weight;
            value -= b ? weight : 0;
            array.push(b ? 0.5 : 0.8);
            var t = s + offset;
            if (t < 0) return value;
            var osc = ctx.createOscillator();
            osc.type = "square";
            osc.frequency.value = freq;
            osc.start(t);
            osc.stop(t + (b ? 0.5 : 0.8));
            osc.connect(ctx.destination);
            return value;
        }

        marker(0); // マーカー(M)

        // 分
        pa = 0;
        minute = bit(1, minute,  40);
        minute = bit(2, minute,  20);
        minute = bit(3, minute,  10);
        minute = bit(4, minute,  16);
        minute = bit(5, minute,  8);
        minute = bit(6, minute,  4);
        minute = bit(7, minute,  2);
        minute = bit(8, minute,  1);
        var pa2 = pa;

        marker(9); // P1

        // 時
        pa = 0;
        hour = bit(10, hour, 80);
        hour = bit(11, hour, 40);
        hour = bit(12, hour, 20);
        hour = bit(13, hour, 10);
        hour = bit(14, hour, 16);
        hour = bit(15, hour, 8);
        hour = bit(16, hour, 4);
        hour = bit(17, hour, 2);
        hour = bit(18, hour, 1);
        var pa1 = pa;

        marker(19); // P2

        // 1月1日からの通算日
        year_day = bit(20, year_day, 800);
        year_day = bit(21, year_day, 400);
        year_day = bit(22, year_day, 200);
        year_day = bit(23, year_day, 100);
        year_day = bit(24, year_day, 160);
        year_day = bit(25, year_day, 80);
        year_day = bit(26, year_day, 40);
        year_day = bit(27, year_day, 20);
        year_day = bit(28, year_day, 10);

        marker(29); // P3

        year_day = bit(30, year_day, 8);
        year_day = bit(31, year_day, 4);
        year_day = bit(32, year_day, 2);
        year_day = bit(33, year_day, 1);

        bit(34, 0, 1); // 0
        bit(35, 0, 1); // 0
        bit(36, pa1 % 2, 1);
        bit(37, pa2 % 2, 1);
        bit(38, 0, 1); // SU1

        marker(39); // P4

        bit(40, 0, 1); // SU2

        // 年
        year = bit(41, year, 80);
        year = bit(42, year, 40);
        year = bit(43, year, 20);
        year = bit(44, year, 10);
        year = bit(45, year, 8);
        year = bit(46, year, 4);
        year = bit(47, year, 2);
        year = bit(48, year, 1);

        marker(49); // P5

        // 曜日
        week_day = bit(50, week_day, 4);
        week_day = bit(51, week_day, 2);
        week_day = bit(52, week_day, 1);

        // うるう秒
        bit(53, 0, 1); // 0
        bit(54, 0, 1); // 0

        bit(55, 0, 1); // 0
        bit(56, 0, 1); // 0
        bit(57, 0, 1); // 0
        bit(58, 0, 1); // 0

        marker(59); // P0

        return array;
    }

    var intervalId;

    function start() {
        ctx = new AudioContext();
        var now = Date.now();
        var t = Math.floor(now / (60 * 1000)) * 60 * 1000;
        var next = t + 60 * 1000;
        var delay = next - now - 1000; // 毎分0秒ピッタリの少し前にタイマーをセットする
        if (delay < 0) {
            t = next;
            delay += 60 * 1000;
        }
        signal = schedule(new Date(t));

        setTimeout(function() {
            interval();
            intervalId = setInterval(interval, 60 * 1000);
        }, delay);

        function interval() {
            t += 60 * 1000;
            signal = schedule(new Date(t));
        }
    }

    function stop() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
        if (ctx) {
            ctx.close();
            ctx = null;
        }
        signal = undefined;
    }

    var control_button = document.getElementById("control-button");
    var play_flag = false;

    control_button.addEventListener('click', function() {
        if (play_flag) {
            control_button.innerText = "Start";
            play_flag = false;
            stop();
        } else {
            control_button.innerText = "Stop";
            play_flag = true;
            start();
        }
    });

    var nowtime = document.getElementById('time');
    var canvas = document.getElementById('canvas');
    var ctx2d = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;

    render();
    function render() {
        nowtime.innerText = new Date().toString();

        var i;
        ctx2d.clearRect(0, 0, w, h);
        if (!signal) {
            requestAnimationFrame(render);
            return;
        }
        var now = Math.floor(Date.now() / 1000) % 60;

        for (i = 0; i < signal.length; i++) {
            if (i == now) {
                if (signal[i] < 0.3) ctx2d.fillStyle = "#FF0000";
                else if (signal[i] < 0.7) ctx2d.fillStyle = "#FFFF00";
                else ctx2d.fillStyle = "#00FF00";
            } else {
                if (signal[i] < 0.3) ctx2d.fillStyle = "#7F0000";
                else if (signal[i] < 0.7) ctx2d.fillStyle = "#7F7F00";
                else ctx2d.fillStyle = "#007F00";
            }
            ctx2d.fillRect((i%30)*30, Math.floor(i/30)*100, 30 * signal[i], 80);
        }
        requestAnimationFrame(render);
    }

})();
