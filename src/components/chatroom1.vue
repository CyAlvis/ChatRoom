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
        <li v-if="name != chosenName" class='ctx-item' @click="inviteFriend">邀請好友</li>
      </context-menu>
    </div>
    <!-- 對話框 -->
    <div id="content">
      <ul style="list-style-type: none">
        <li v-for="msg in msgs">
          <span v-if=" msg.urlType == 0 ">{{msg.msg}}</span>
          <div style=" clear: both;" class="url" v-if=" msg.urlType != 0 ">
            {{msg.msg}}<a target="_blank" :href="msg.url.requestUrl">{{msg.url.requestUrl}}</a>
            <a target="_blank" class="urltype-href" :href="msg.url.requestUrl">
              <div id="urltype-2" v-if=" msg.urlType == 2 ">
                <div id="urltype-2-info">
                  <h1>{{msg.url.data.ogTitle}}</h1>
                  {{msg.url.data.ogDescription}}
                </div>
                <img id="image" :src="msg.image" :href="msg.url.requestUrl">
              </div>
            </a>
            <div id="urltype-3" v-if=" msg.urlType == 3 ">
              <div id="video">
                <iframe width="100%" height="100%" :src="msg.url.data.ogVideo.url" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
              </div>
              <a target="_blank" class="urltype-href" :href="msg.url.requestUrl">
                <div id="urltype-3-info">
                  <h1>{{msg.url.data.ogTitle}}</h1>
                  {{msg.url.data.ogDescription}}
                </div>
              </a>
            </div>
          </div>
        </li>
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
        <button v-click-outside="hideEmoji" type="button" @click="emoji = true">表情符號</button>
        <input type="button" @click="say" value="送出">
      </div>
      <div id="open-emoji" v-click-outside="hideEmoji" v-if="emoji">
        <picker set="google" @select="addEmoji" />
      </div>
    </div>
  </div>
</template>

<script>
  import contextMenu from "vue-context-menu";
  import {
    Picker,
    Emoji
  } from "emoji-mart-vue";
  import ClickOutside from "vue-click-outside";
  export default {
    data() {
      return {
        status: "",
        roomCount: 0,
        msgs: [],
        msg: "",
        room: "ChatRoom1",
        name: "",
        type: "",
        check: "none",
        target: "",
        objects: [],
        currUsers: [],
        friendList: [],
        toBeFriend: [],
        chosenName: "",
        emoji: false,
      };
    },
    components: {
      contextMenu,
      Picker,
      Emoji
    },
    directives: {
      ClickOutside
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
      addEmoji(emoji) {
        this.msg = this.msg + emoji.native;
        this.emoji = false;
        console.log(emoji);
      },
      hideEmoji() {
        this.emoji = false;
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
        let ret = {};
        let image;
        switch (msg.event) {
          case "join":
            this.msgs.push({
              msg: msg.name + " 加入了聊天室",
            });
            break;
          case "msg":
            if (msg.urlType == 0) {
              ret = {
                msg: msg.name + "  :  " + msg.msg,
                urlType: 0
              }
            } else {
              image = msg.url.data.ogImage;
              if (msg.urlType != 1) {
                image = Array.isArray(image) && image.length == 0 ? image[0].url : image.url;
              };
              ret = {
                msg: msg.name + "  :  ",
                url: msg.url,
                urlType: msg.urlType,
                image: image
              }
            }
            this.msgs.push(ret);
            break;
          case "whisper":
            if (msg.urlType == 0) {
              ret = {
                msg: "(From " + msg.name + ")  " + msg.msg,
                urlType: 0
              }
            } else {
              image = msg.url.data.ogImage;
              if (msg.urlType != 1) {
                image = Array.isArray(image) && image.length == 0 ? image[0].url : image.url;
              };
              ret = {
                msg: "(From " + msg.name + ")  ",
                url: msg.url,
                urlType: msg.urlType,
                image: image
              }
            }
            this.msgs.push(ret);
            if (!this.objects.includes(msg.name)) {
              this.objects.push(msg.name);
            }
            break;
          case "response":
            if (msg.urlType == 0) {
              ret = {
                msg: "(To " + msg.name + ")  " + msg.msg,
                urlType: 0
              }
            } else {
              image = msg.url.data.ogImage;
              if (msg.urlType != 1) {
                image = Array.isArray(image) && image.length == 0 ? image[0].url : image.url;
              };
              ret = {
                msg: "(To " + msg.name + ")  ",
                url: msg.url,
                urlType: msg.urlType,
                image: image
              }
            }
            this.msgs.push(ret);
            if (!this.objects.includes(msg.name)) {
              this.objects.push(msg.name);
            }
            break;
          case "reject":
            this.msgs.push(msg.name + " 拒絕了你的好友邀請！");
            break;
          case "delete":
            this.msgs.push(msg.name + " 刪除了你的好友！");
            break;
          case "error":
            this.msgs.push(msg.msg);
            break;
          case "leave":
            this.msgs.push(msg.name + " 離開了聊天室");
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
      console.log('chatroom1');
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
  * {
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    box-sizing: border-box;
  }
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
    height: 600px;
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
    width: 60%;
    height: 600px;
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
  .urltype-href {
    color: black;
  }
  .urltype-href:hover {
    color: #42b983;
  }
  #urltype-2 {
    margin: 5px 0 25px 15px;
    border: 0.5px solid black;
    border-radius: 1%;
    width: 450px;
    height: 100px;
    padding: 10px;
  }
  #urltype-2-info {
    white-space: nowrap;
    font-size: 15px;
    float: left;
    height: 100%;
    width: 70%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #urltype-2-info h1 {
    font-size: 18px;
    margin: 10px 0 0 0;
  }
  #image {
    float: right;
    width: 30%;
    max-height: 100%;
  }
  #urltype-3 {
    margin: 5px 0 25px 15px;
    border: 0.5px solid black;
    border-radius: 1%;
    width: 450px;
    height: 350px;
    padding: 10px;
  }
  #urltype-3-info {
    white-space: nowrap;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  #urltype-3-info h1 {
    font-size: 18px;
    margin: 10px 0 5px 0;
  }
  #video {
    text-align: center;
    width: 100%;
    height: 80%;
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
    clear: both;
    width: 58%;
    margin: 0 auto;
    position: relative;
  }
  #open-emoji {
    position: absolute;
    top: -420px;
    left: 65%;
  }
  #send-box input {
    display: inline-block;
  }
  #send-box input.error {
    border: 1px solid red;
  }
  #send-form {
    width: 100%;
    height: 25px;
    clear: both;
  }
  #send-form input {
    height: 100%;
  }
  #send-form button {
    height:100%;    
    width: 10%;
  }
  input[name="target"] {
    width: 15%;
  }
  input[name="msg"] {
    width: 60%;
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