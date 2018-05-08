<template>
  <div class="container">
    <div id="header">
      <div id="user-info"><span id="user">User Name: {{name}}</span></div>
      <div id="title">{{room}}</div>
      <div id="status-box">Server: <span id="status">{{status}}</span> / <span id="online">{{roomCount}}</span> online.</div>
      <div id="choose-room">
        <b-btn size="sm" class="room" type="button" @click="router('chatroom1')" variant="primary">Chat Room 1</b-btn>
        <b-btn size="sm" class="room" type="button" @click="router('chatroom2')" variant="primary">Chat Room 2</b-btn>
        <b-btn size="sm" id="guild" @click="openModal('main')">檢視公會</b-btn>
      </div>
      <div>
        <!-- Modal Component -->
        <b-modal ref="getGuild">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">公會：{{guildInfo.name}}</span>
            <b-btn v-if="[0,1].includes(currPrivilege)" size="sm" style="position:absolute; right:16px;" variant="primary" @click="openModal('editGuild')">編輯</b-btn>
          </div>
          <table>
            <tr>
              <th>暱稱</th>
              <th>職位</th>
              <th>狀態</th>
            </tr>
            <tr v-for="member in Object.keys(guildInfo.memberList)" v-if="guildInfo.memberList[member].privilege >= 0">
              <td>{{guildInfo.memberList[member].name}}</td>
              <td>{{guildInfo.memberList[member].privilege == 2 ? '會員' : (guildInfo.memberList[member].privilege == 1 ? '副會長' : '會長')}}
              </td>
            </tr>
          </table>
        </b-modal>
        <b-modal ref="joinGuild">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">加入公會</span>
            <b-btn size="sm" style="position:absolute; right:16px;" variant="primary" @click="openModal('createGuild')">創建公會</b-btn>
          </div>
          <table>
            <tr>
              <th>編號</th>
              <th>公會名稱</th>
              <th>會長</th>
              <th>會員數</th>
            </tr>
            <tr v-for="guild in guildList">
              <td>{{guild.id}}</td>
              <td>{{guild.name}}</td>
              <td>{{guild.master.name}}</td>
              <td>{{guild.count}}</td>
              <td>
                <b-btn type="button" v-if="!guildApply.includes(guild.id)" @click="applyGuild(guild.id)">申請加入</b-btn>
                <b-btn type="button" v-if="guildApply.includes(guild.id)" disabled>已申請</b-btn>
              </td>
            </tr>
          </table>
        </b-modal>
        <b-modal ref="createGuild">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">創建公會</span>
          </div>
          <form>
            <input type="text" placeholder="請輸入公會名稱" v-model="newGuildName">
            <b-btn type="button" @click="createGuild">創建</b-btn>
          </form>
          <div slot="modal-footer" class="w-100">
            <b-btn class="float-right" @click="openModal('main')">
              返回
            </b-btn>
          </div>
        </b-modal>
        <b-modal size="lg" ref="editGuild">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">編輯公會</span>
            <b-btn size="sm" style="position:absolute; right:126px;" variant="primary" @click="openModal('editGuildName')">更改公會名稱</b-btn>
            <b-btn size="sm" style="position:absolute; right:16px;" variant="primary" @click="openModal('applyGuild')">查看公會申請</b-btn>
          </div>
          <table>
            <tr>
              <th>暱稱</th>
              <th>職位</th>
              <th>狀態</th>
            </tr>
            <tr v-for="member in Object.keys(guildInfo.memberList)" v-if="guildInfo.memberList[member].privilege >= 0">
              <td>{{guildInfo.memberList[member].name}}</td>
              <td>
                <span v-if="guildInfo.memberList[member].name==name">會長</span>
                <select class="select" v-if="guildInfo.memberList[member].name!=name" v-model="guildInfo.memberList[member].privilege" @change="guildInfoChange($event, member)">
                                  <option v-for="option in options" :value="option.value">
                                   {{ option.text }}
                                  </option>
                                  </select>
              </td>
              <td> </td>
              <td>
                <b-btn size="sm" v-if="guildInfo.memberList[member].privilege != 0" @click="kickOutGuild(member)">踢出公會</b-btn>
                <span v-if="Object.keys(guildChangeList).includes(member)">*</span>
              </td>
            </tr>
          </table>
          <div slot="modal-footer" class="w-100">
            <b-btn style="margin-left:4px;" class="float-right" variant="primary" @click="editGuild('ok')">
              確定變更
            </b-btn>
            <b-btn style="margin-right:4px;" class="float-right" @click="editGuild('cancel')">
              返回
            </b-btn>
          </div>
        </b-modal>
        <b-modal ref="applyGuild">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">申請名單</span>
          </div>
          <table>
            <tr v-for="member in Object.keys(guildInfo.memberList)" v-if="guildInfo.memberList[member].privilege == -1">
              <td>{{guildInfo.memberList[member].name}}</td>
              <td>
                <b-btn variant="primary" @click="acceptGuildApply(member)">接受申請</b-btn>
              </td>
            </tr>
          </table>
          <div slot="modal-footer" class="w-100">
            <b-btn class="float-right" @click="openModal('editGuild')">
              返回
            </b-btn>
          </div>
        </b-modal>
        <b-modal ref="editGuildName">
          <div style="text-align: center" slot="modal-header" class="w-100">
            <span style="position:relative;">更改公會名稱</span>
          </div>
          <form>
            <input type="text" placeholder="請輸入公會名稱" v-model="newGuildName">
          </form>
          <div slot="modal-footer" class="w-100">
            <b-btn style="margin-left:4px;" class="float-right" variant="primary" @click="editGuildName('ok')">
              確定變更
            </b-btn>
            <b-btn style="margin-right:4px;" class="float-right" @click="editGuildName('cancel')">
              返回
            </b-btn>
          </div>
        </b-modal>
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
          <span v-if=" msg.urlType == undefined || msg.urlType == 0 ">{{msg.msg}}</span>
          <div style=" clear: both;" class="url" v-if="msg.urlType != undefined && msg.urlType != 0 ">
            {{msg.msg}}<a target="_blank" :href="msg.url.requestUrl">{{msg.url.requestUrl}}</a>
            <a class="urltype-href" :href="msg.url.requestUrl">
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
                <img id="online" :src="friend.status == 1 ? 'https://upload.wikimedia.org/wikipedia/commons/5/5d/Green_sphere.svg' : 'https://upload.wikimedia.org/wikipedia/commons/6/60/Nuvola_apps_krec.svg'">
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
        <button type="button" @click="emoji = true">表情符號</button>
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
        room: "Lobby",
        name: "",
        guildId: "",
        id: "",
        type: "",
        check: "none",
        target: "",
        objects: [],
        currUsers: [],
        friendList: [],
        toBeFriend: [],
        chosenName: "",
        emoji: false,
        currPrivilege: -2,
        currInterface: "",
        guildInfo: {
          memberList: {}
        },
        // guildInfo: {
        //   name: "Guild",
        //   master: {
        //     id: 4,
        //     name: "ib1"
        //   },
        //   memberList: {
        //     4: {
        //       name: "ib1",
        //       privilege: 0
        //     },
        //     5: {
        //       name: "ib2",
        //       privilege: 2
        //     },
        //     6: {
        //       name: "ib3",
        //       privilege: 2
        //     }
        //   }
        // },
        guildChangeList: {},
        guildList: [],
        guildApply: [],
        options: [{
            text: '副會長',
            value: 1
          },
          {
            text: '會員',
            value: 2
          }
        ],
        newGuildName: "",
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
      interaction() {
        let ret = {
          fromName: this.name,
          toName: this.chosenName
        }
        return ret;
      },
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
      openModal(modal) {
        this.currInterface = modal;
        this.$socket.emit("updateGuildInfo");
      },
      editGuild(event) {
        if ([0,1].includes(this.currPrivilege)) {
          switch (event) {
            case "cancel":
              this.guildApply = [];
              this.openModal("main");
              break;
            case "ok":
              let ret = confirm("確定要儲存變更？");
              if (ret) {
                this.$socket.emit("changeGuildPri", this.guildChangeList);
                this.openModal("main");
              }
              break;
          };
        } else if (this.currPrivilege == -2) {
          alert("你已從公會被踢出！");
          this.openModal("main");
        } else {
          alert("你的權限不足！");
          this.openModal("main");
        };
      },
      editGuildName(event) {
        this.guildApply = [];
        switch (event) {
          case "cancel":
            this.newGuildName = "";
            this.openModal("editGuild");
            break;
          case "ok":
            let ret = confirm("確定要儲存變更？");
            if (ret) {
              this.$socket.emit("changeGuildName", this.newGuildName);
              this.newGuildName = "";
              this.openModal("editGuild");
            }
            break;
        };
      },
      acceptGuildApply(id) {
        this.$socket.emit("acceptGuildApply", id);
        this.guildInfo.memberList[id].privilege = 2;
      },
      kickOutGuild(id) {
        let ret = confirm("確定踢出該會員？");
        if (ret) {
          this.$socket.emit("kickOutGuild", id);
          this.openModal("editModal");
        }
      },
      guildInfoChange(event, value) {
        this.guildChangeList[value] = event.target.value;
      },
      createGuild() {
        this.currInterface = "getGuild";
        this.$socket.emit("createGuild", this.newGuildName);
      },
      applyGuild(guildId) {
        this.$socket.emit("applyGuild", guildId);
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
            type: "normal",
            room: this.room,
            name: this.name,
            msg: this.msg
          });
          this.msg = "";
        } else if (this.target == "/guild") {
          this.$socket.emit("say", {
            type: "guild",
            room: this.guildId,
            name: this.name,
            msg: this.msg
          });
          this.msg = "";
        } else {
          this.whisper();
        }
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
        this.name = user.name;
        this.id = user.id;
        this.guildId = user.guildId;
      },
      online(currRoom) {
        this.roomCount = currRoom.roomCount;
        this.currUsers = currRoom.currUsers;
      },
      newGuildInfo(ret) {
        switch (ret.event) {
          case "join":
            this.guildList = ret.guildList;
            this.guildApply = ret.guildApply;
            this.guildInfo = {
              memberList: {}
            };
            break;
          case "get":
            this.guildInfo = ret.guildInfo;
            this.currPrivilege = this.guildInfo.memberList[this.id].privilege;
            this.guildList = [];
            this.guildApply = [];
            break;
        }
        console.log(this.currInterface);
        if (this.currInterface == "main") {
          switch (ret.event) {
            case "join":
              this.$refs.joinGuild.show();
              break;
            case "get":
              this.$refs.getGuild.show();
              break;
          }
        } else {
          this.$refs[this.currInterface].show();
          this.currInterface = "";
        }
      },
      changePri(newPri) {
        this.currPrivilege = newPri;
      },
      appliedGuild(guildId) {
        this.guildApply.push(guildId);
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
            if (msg.type == "guild") {
              ret.msg = "(guild) " + ret.msg
            };
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
            this.msgs.push({
              msg: msg.name + " 拒絕了你的好友邀請！"
            });
            break;
          case "delete":
            this.msgs.push({
              msg: msg.name + " 刪除了你的好友！"
            });
            break;
          case "error":
            switch (msg.errType) {
              case "guildName":
                alert(msg.msg);
                this.$refs.createGuild.show();
                break;
              case "guildCreate":
                alert(msg.msg);
                this.openModal("main");
                break;
              case "applyAccept":
                alert(msg.msg);
                this.openModal("editGuild");
                break;
              default:
                this.msgs.push({
                  msg: msg.msg
                });
                break;
            }
            break;
          case "leave":
            this.msgs.push({
              msg: msg.name + " 離開了聊天室"
            });
            break;
        }
        let content = document.getElementById('content');
        setTimeout(() => {
          content.scrollTop = 9999999;
        }, 0);
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
      console.log('lobby');
      let vm = this;
      window.addEventListener('popstate', vm.quit);
      if (this.$route.params.room != undefined) {
        this.$socket.emit("leave", this.$route.params.room);
      };
      if (window.name != '') {
        localStorage.setItem('token', window.name);
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
  .container {
    font-family: Microsoft JhengHei;
    margin: 10px auto 0 auto;
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
    height: 30px;
    clear: both;
    position: relative;
    text-align: center;
  }
  .room {
    margin: 0 1% 0 0.5%;
    height: 100%;
  }
  #guild {
    position: absolute;
    right: 3.5%;
    height: 100%;
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
  .select {
    display: inline-block;
    width: 100%;
    height: calc(2.25rem + 2px);
    padding: 0.375rem 1.75rem 0.375rem 0.75rem;
    line-height: 1.5;
    color: #495057;
    vertical-align: middle;
    background: #fff url("data:image/svg+xml;charset=utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 5'><path fill='%23343a40' d='M2 0L0 2h4zm0 5L0 3h4z'/></svg>") no-repeat right 0.75rem center;
    background-size: 8px 10px;
    border: 1px solid #ced4da;
    border-radius: 0.25rem;
    -webkit-appearance: none;
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
    width: 15%;
    height: 100%;
    overflow: hidden;
  }
  input[name="target"] {
    width: 15%;
  }
  input[name="msg"] {
    width: 55%;
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