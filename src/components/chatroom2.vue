<template>
  <div class="container">
    <div id="header">
      <div id="user-info"><span id="user">User Name: {{name}}</span></div>
      <div id="title">{{room}}</div>
      <div id="status-box">Server: <span id="status">{{status}}</span> / <span id="online">{{roomCount}}</span> online.</div>
      <div id="choose-room">
        <button type="button" @click="router('index')">Lobby</button>
      </div>
    </div>
    <!-- 房內全玩家 -->
    <div id="sidebar-left" class="sidebar">
      <h1>線上成員</h1>
      <div class="list">
        <table class="table" width="100%">
          <tr v-for="currUser in currUsers" @contextmenu.prevent="$refs.ctxUsers.open($event, {name: currUser})">
            <td>{{currUser}} </td>
          </tr>
        </table>
      </div>
      <context-menu id="context-menu" ref="ctxUsers" @ctx-open="ctxM">
        <li class='ctx-item' @click="chooseUser">密語</li>
        <li class='ctx-item' @click="inviteFriend">邀請好友</li>
      </context-menu>
    </div>
    <!-- 對話框 -->
    <div id="content">
      <ul>
        <li v-for="msg in msgs"> {{msg}} </li>
      </ul>
    </div>
    <div id="sidebar-right" class="sidebar">
      <!-- 好友 -->
      <h1>好友名單</h1>
      <div class="list">
        <div id="friend">
          <table class="table" width="100%">
            <tr v-for="friend in friendList" @contextmenu.prevent="$refs.ctxFriends.open($event, {name: friend.name})">
              <td>
                {{friend.name}}
                <img id="online" :src="friend.status == 1 ?
                    'https://upload.wikimedia.org/wikipedia/commons/5/5d/Green_sphere.svg':
                    'https://upload.wikimedia.org/wikipedia/commons/6/60/Nuvola_apps_krec.svg'">
              </td>
            </tr>
          </table>
          <context-menu id="context-menu" ref="ctxFriends" @ctx-open="ctxM">
            <li class='ctx-item' @click="chooseUser">密語</li>
            <li class='ctx-item' @click="deleteFriend">刪除好友</li>
          </context-menu>
        </div>
        <!-- 待接受好友 -->
        <!-- <div id="tobefriend" v-if="toBeFriend.length != 0"> -->
        <div v-if="toBeFriend.length > 0" id="tobefriend">
          <h1>好友申請</h1>
          <table class="table" width="100%">
            <tr v-for="friend in toBeFriend" @contextmenu.prevent="$refs.ctxToBeFriend.open($event, {name: friend.name, type: friend.type})">
              <td width="50%">{{friend.name}} </td>
              <td width="50%" id="invite-status">{{friend.type == 0 ? "等待接受" : "已邀請"}} </td>
            </tr>
          </table>
        </div>
        <context-menu id="context-menu" ref="ctxToBeFriend" @ctx-open="ctxM">
          <li v-if="type != 0" class='ctx-item' @click="cancelInvite">取消邀請</li>
          <li v-if="type == 0" class='ctx-item' @click="acceptFriend">接受好友</li>
          <li v-if="type == 0" class='ctx-item' @click="rejectFriend">拒絕好友</li>
        </context-menu>
      </div>
    </div>
    <!-- 輸入框 -->
    <div id="send-box">
      <div id="send-form">
        <input name="target" type="text" list="objects" v-model="target" placeholder="All" />
        <datalist id="objects"><option v-for="object in objects" :value="object">{{object}}</option></datalist>
        <input name="msg" placeholder="說點什麼？" v-model="msg" @keyup.enter="say">
        <input type="button" @click="say" value="送出">
      </div>
    </div>
  </div>
</template>

<script>
  import contextMenu from "vue-context-menu";
  export default {
    data() {
      return {
        status: "",
        roomCount: 0,
        msgs: [],
        msg: "",
        room: "ChatRoom2",
        name: "",
        type: "",
        check: "none",
        target: "",
        objects: [],
        currUsers: [],
        friendList: [],
        toBeFriend: [],
        chosenName: ""
      };
    },
    components: {
      contextMenu
    },
    computed: {
      interaction: function() {
        let ret = {
          fromName: this.name,
          toName: this.chosenName
        }
        return ret;
      }
    },
    methods: {
      router(path) {
        this.$router.push({
          name: path,
          params: {
            room: this.room
          }
        });
      },
      ctxM(locals) {
        this.chosenName = locals.name;
        this.type = locals.type;
      },
      chooseUser() {
        this.target = this.chosenName;
        if (!this.objects.includes(this.chosenName)) {
          this.objects.push(this.chosenName);
        }
      },
      inviteFriend() {
        this.$socket.emit("inviteFriend", this.interaction);
      },
      acceptFriend() {
        this.$socket.emit("acceptFriend", this.interaction);
      },
      rejectFriend() {
        this.$socket.emit("rejectFriend", this.interaction);
      },
      deleteFriend() {
        this.$socket.emit("deleteFriend", this.interaction);
      },
      cancelInvite() {
        this.$socket.emit("cancelInvite", this.interaction);
      },
      quit() {
        console.log("quit");
        this.$socket.emit("leave");
        this.rmEvent();
      },
      rmEvent() {
        let vm = this;
        window.removeEventListener('popstate', vm.quit);
      },
      say() {
        if (this.target == "") {
          this.$socket.emit("say", {
            room: this.room,
            name: this.name,
            msg: this.msg
          });
          this.msg = "";
        } else {
          this.whisper();
        }
        let content = document.getElementById('content');
        setTimeout(() => {
          content.scrollTop = 9999999;
        }, 0);
      },
      whisper() {
        this.$socket.emit("whisper", {
          target: this.target,
          name: this.name,
          msg: this.msg
        });
        this.msg = "";
      }
    },
    sockets: {
      connect() {
        console.log("socket connected");
      },
      check(ret) {
        this.$socket.emit("join", this.room);
        this.status = "Connection";
      },
      join(user) {
        this.name = user;
      },
      online(currRoom) {
        this.roomCount = currRoom.roomCount;
        this.currUsers = currRoom.currUsers;
      },
      newFriend(user) {
        this.friendList.push(user);
        let nameList = this.toBeFriend.map(x => x.name);
        let index = nameList.indexOf(user.name);
        this.toBeFriend.splice(index, 1);
      },
      noFriend(user) {
        let nameList = this.toBeFriend.map(x => x.name);
        let index = nameList.indexOf(user);
        this.toBeFriend.splice(index, 1);
      },
      notFriend(user) {
        let nameList = this.friendList.map(x => x.name);
        let index = nameList.indexOf(user.name);
        this.friendList.splice(index, 1);
      },
      getList(list) {
        this.friendList = list.friendList;
        this.toBeFriend = list.toBeFriendList;
      },
      invite(user) {
        let ret = {
          name: user,
          status: 1,
          type: -1
        }
        this.toBeFriend.push(ret);
      },
      beInvited(user) {
        let ret = {
          name: user,
          status: 1,
          type: 0
        }
        this.toBeFriend.push(ret);
      },
      cancelInvite(user) {
        let nameList = this.toBeFriend.map(x => x.name);
        let index = nameList.indexOf(user);
        this.toBeFriend.splice(index, 1);
      },
      changeStatus(user) {
        let nameList = [];
        let index;
        switch (user.event) {
          case ("online"):
            switch (user.type) {
              case (1):
                nameList = this.friendList.map(x => x.name);
                index = nameList.indexOf(user.name);
                this.friendList[index].status = 1;
                break;
              default:
                nameList = this.toBeFriend.map(x => x.name);
                index = nameList.indexOf(user.name);
                this.toBeFriend[index].status = 1;
                break;
            }
            break;
          case ("offline"):
            switch (user.type) {
              case (1):
                nameList = this.friendList.map(x => x.name);
                index = nameList.indexOf(user.name);
                this.friendList[index].status = 0;
                break;
              default:
                nameList = this.toBeFriend.map(x => x.name);
                index = nameList.indexOf(user.name);
                this.toBeFriend[index].status = 0;
                break;
            }
            break;
        }
      },
      message(msg) {
        switch (msg.event) {
          case "join":
            this.msgs.push(msg.name + "加入了聊天室");
            break;
          case "msg":
            this.msgs.push(msg.name + ":  " + msg.msg);
            break;
          case "whisper":
            this.msgs.push("(From " + msg.name + ") " + msg.msg);
            if (!this.objects.includes(msg.name)) {
              this.objects.push(msg.name);
            }
            break;
          case "response":
            this.msgs.push("(To " + msg.name + ") " + msg.msg);
            if (!this.objects.includes(msg.name)) {
              this.objects.push(msg.name);
            }
            break;
          case "reject":
            this.msgs.push(msg.name + "拒絕了你的好友邀請！");
            break;
          case "delete":
            this.msgs.push(msg.name + "刪除了你的好友！");
            break;
          case "error":
            this.msgs.push(msg.msg);
            break;
          case "leave":
            this.msgs.push(msg.name + "離開了聊天室");
            break;
        }
      },
      manager(retData) {
        switch (retData.event) {
          case "offline":
            alert("你已被強制登出！");
            this.$socket.emit('offline', localStorage.token);
            localStorage.clear();
            window.location.replace("http://192.168.0.123");
            break;
          case "announce":
            this.msgs.push("（系統公告）" + retData.msg);
            break;
        }
      },
      redirect(destination) {
        alert("請先登入再進聊天室");
        window.location.replace(destination);
      }
    },
    mounted() {
      console.log('chatroom2');
      let vm = this;
      window.addEventListener("popstate", vm.quit);
      if (this.$route.params.room != undefined) {
        this.$socket.emit("leave", this.$route.params.room);
      };
      this.$socket.emit("join", localStorage.token, this.room);
    },
    destroyed() {
      this.rmEvent();
    },
  };
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  a {
    color: #42b983;
  }
  html,
  body {
    padding: 0;
    margin: 0;
  }
  .list {
    overflow: auto;
    text-align: center;
    font-size: 18px;
    height: 80%;
    margin: 0;
  }
  #container {
    font-family: Microsoft JhengHei;
    top: 50px;
    width: 500px;
    margin: 0 auto;
    display: block;
    position: relative;
  }
  #user-info {
    float: left;
    text-align: left;
    width: 33%;
    height: 40px;
    font-size: 20px;
  }
  #title {
    float: left;
    text-align: center;
    width: 33%;
    height: 40px;
    font-size: 25px;
  }
  #status-box {
    float: left;
    width: 33%;
    height: 40px;
    text-align: right;
    font-size: 0.9em;
  }
  #choose-room {
    text-align: center;
  }
  .table td {
    padding: 2px;
  }
  #invite-status {
    font-size: 15px;
  }
  .sidebar {
    margin-top: 10px;
    height: 500px;
    width: 18%;
    text-align: center;
    border: 1px solid darkolivegreen;
    border-radius: 5px;
  }
  .sidebar h1 {
    margin-top: 10px;
    margin-bottom: 0;
    font-size: 19px;
    font-weight: 600;
  }
  #sidebar-left {
    clear: both;
    float: left;
    margin-right: 10px;
  }
  #content {
    float: left;
    width: 58%;
    height: 500px;
    border: 1px solid darkolivegreen;
    border-radius: 5px;
    overflow: auto;
    margin-top: 10px;
    margin-bottom: 10px;
    word-wrap: break-word;
    font-size: 18px;
    padding-left: 10px;
    padding-right: 10px;
  }
  #sidebar-right {
    float: left;
    margin-left: 10px;
  }
  #friend {
    height: 50%;
    overflow: auto;
    /* background: aquamarine; */
  }
  #tobefriend {
    text-align: center;
    height: 50%;
    overflow: auto;
  }
  #online {
    margin-left: 5px;
    width: 10px;
  }
  #send-box {
    width: 58%;
    margin: 0 auto;
  }
  #send-box input {
    display: inline-block;
  }
  #send-box input.error {
    border: 1px solid red;
  }
  #send-form {
    clear: both;
  }
  input[name="target"] {
    width: 15%;
  }
  input[name="msg"] {
    width: 65%;
  }
  input[type="button"] {
    width: 10%;
  }
  .msg {
    width: 73%;
    display: inline-block;
    padding: 5px 0 5px 10px;
  }
  .msg>span {
    width: 25%;
    display: inline-block;
  }
  .msg>span::before {
    color: darkred;
    content: " { ";
  }
  .msg>span::after {
    color: darkred;
    content: " } ";
  }
  .ctx-item {
    cursor: pointer;
  }
</style>