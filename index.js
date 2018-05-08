const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);

const asyncredis = require("async-redis");
const client = asyncredis.createClient(6379, "127.0.0.1");

const mysql = require("mysql");
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "company"
});

const mysql2 = require("mysql2/promise");
const mysqlConnectionData = {
  host: "localhost",
  user: "root",
  database: "company"
};
const emoji = require("node-emoji");
const ogs = require("open-graph-scraper");

const redis = require("redis");
const redisClient = redis.createClient;
const pub = redisClient({ port: 6379, host: "127.0.0.1" });
const sub = redisClient({ port: 6379, host: "127.0.0.1" });

const AgentID = 2;

app.use(express.static(__dirname + "/dist"));
app.get("/", function(req, res) {
  res.sendfile("index.html");
});

// 確認redis成功連接
client.on("ready", function(res) {
  console.log("Redis is ready");
});

// 確認mysql成功連接
connection.connect(async err => {
  if (err) throw err;
  console.log("Mysql is ready");
  // 好友名單寫入Redis
  let friendList = await sql(
    "select f.UserID, l.Name, f.TypeID from friends f join login l on f.RelatedUserID = l.id order by f.UserID"
  );
  friendList.push({ UserID: 0 });
  let id = 0;
  let friends = {};
  let key;
  for (let element of friendList) {
    if (id != element.UserID) {
      if (id != 0) {
        key = "Agent:" + AgentID + ":Friend:" + id;
        client.set(key, JSON.stringify(friends));
      }
      id = element.UserID;
      friends = {};
      friends[element.Name] = element.TypeID;
    } else {
      friends[element.Name] = element.TypeID;
    }
  }
  // 公會名單寫入Redis
  let guildInfo = await sql("SELECT * FROM guild_info");
  let memberList = await sql(
    "SELECT \
        g.UserID, \
        l.Name, \
        g.GuildNo, \
        g.Privilege \
     FROM guilds g \
     JOIN login l ON l.id = g.UserID"
  );
  let guildList = [];
  let memberApplyList = {};
  for (let guild of guildInfo) {
    let members = {};
    let count = 0;
    let masterName;
    memberList.forEach(async (member, index) => {
      if (member.GuildNo == guild.GuildNo) {
        let memberInfo = {
          name: member.Name,
          privilege: member.Privilege
        };
        members[member.UserID] = memberInfo;
        memberList.splice(index, 1);
        if (member.Privilege == 0) {
          masterName = member.Name;
        }
        if (member.Privilege == -1) {
          if (memberApplyList[member.UserID] == undefined) {
            memberApplyList[member.UserID] = [member.GuildNo];
          } else {
            memberApplyList[member.UserID].push(member.GuildNo);
          }
        } else {
          count++;
          await client.set(
            `Agent:${AgentID}:Guild:${member.UserID}`,
            member.GuildNo
          );
        }
      }
    });
    let info = {
      name: guild.GuildName,
      master: {
        id: guild.MasterID,
        name: masterName
      },
      memberList: members
    };
    let ret = {
      id: guild.GuildNo,
      name: guild.GuildName,
      master: {
        id: guild.MasterID,
        name: masterName
      },
      count: count
    };
    guildList.push(ret);
    await client.set(
      `Agent:${AgentID}:GuildInfo:${guild.GuildNo}`,
      JSON.stringify(info)
    );
  }
  for (let member of Object.keys(memberApplyList)) {
    await client.set(
      `Agent:${AgentID}:Guild:${member}`,
      JSON.stringify(memberApplyList[member])
    );
  }
  await client.set(`Agent:${AgentID}:GuildList`, JSON.stringify(guildList));
});

class FromAndTo {
  constructor(fromId, toId, fromName, toName) {
    this.fromId = fromId;
    this.toId = toId;
    this.fromName = fromName;
    this.toName = toName;
  }
}

async function sql(sql) {
  let con = await mysql2.createConnection(mysqlConnectionData);
  [rows, fields] = await con.execute(sql);
  let ret = JSON.parse(JSON.stringify(rows));
  return ret;
}

async function checkToken(token, socketid) {
  let info = await client.get(token);
  info = JSON.parse(info);
  if (info == null) {
    let retData = {
      check: false
    };
    return retData;
  } else {
    sub.subscribe("ChatChannel3000");
    userSet[socketid] = {};
    userSet[socketid].id = info.id;
    userSet[socketid].name = info.Name;
    //
    update = `Agent:${AgentID}:Login:User:${info.id}`;
    let conRedis = await client.get(update);
    conRedis = JSON.parse(conRedis);
    let ret;
    if (conRedis == null) {
      ret = {};
      ret.name = info.Name;
      ret.socketid = [];
      ret.socketid.push(socketid);
    } else {
      conRedis.socketid.push(socketid);
      ret = conRedis;
    }
    await client.set(update, JSON.stringify(ret));
    // 登入使用者ID統計 & 建立暱稱->ID對照表
    update1 = `Agent:${AgentID}:Login:Status`;
    update2 = `Agent:${AgentID}:Login:UserRef`;
    let conRedis1 = await client.get(update1);
    conRedis1 = JSON.parse(conRedis1);
    let conRedis2 = await client.get(update2);
    conRedis2 = JSON.parse(conRedis2);
    let ret1;
    let ret2;
    if (conRedis1 == null) {
      ret1 = [info.id];
      ret2 = {};
      ret2[info.Name] = info.id;
    } else {
      if (!conRedis1.includes(info.id)) {
        conRedis1.push(info.id);
        conRedis2[info.Name] = info.id;
      }
      ret1 = conRedis1;
      ret2 = conRedis2;
    }
    await client.set(update1, JSON.stringify(ret1));
    await client.set(update2, JSON.stringify(ret2));
    let retData = {
      check: true,
      id: info.id,
      name: info.Name
    };
    return retData;
  }
}

const getUrlInfo = function(msg) {
  let options = { url: msg };
  return ogs(options)
    .then(function(result) {
      return result;
    })
    .catch(function(error) {
      return error;
    });
};

var userSet = {};
var checkleave;

io.on("connection", function(socket) {
  // 有連線發生時增加人數
  // 發送人數給網頁
  //   io.emit("online", onlineCount);
  console.log("connection");
  // 訂閱port:3000的channel
  sub.on("message", async (channel, message) => {
    message = JSON.parse(message);
    let target = message.target;
    let user;
    let socketid = [];
    switch (message.event) {
      case "announce":
        switch (target.type) {
          case "all":
            socket.emit("manager", { event: "announce", msg: target.msg });
            break;
          case "room":
            if (socket.adapter.rooms[target.target] != undefined) {
              socketid = Object.keys(
                socket.adapter.rooms[target.target].sockets
              );
              if (socketid.includes(socket.id)) {
                socket.emit("manager", { event: "announce", msg: target.msg });
              }
            }
            break;
          case "user":
            user = await client.get(
              `Agent:${AgentID}:Login:User:${target.target}`
            );
            user = JSON.parse(user);
            socketid = user.socketid;
            if (socketid.includes(socket.id)) {
              socket.emit("manager", { event: "announce", msg: target.msg });
            }
            break;
        }
        break;
      case "kick":
        switch (target.targetType) {
          case "all":
            socket.emit("manager", { event: "offline" });
            break;
          case "room":
            if (socket.adapter.rooms[target.room] != undefined) {
              socketid = Object.keys(socket.adapter.rooms[target.room].sockets);
              if (socketid.includes(socket.id)) {
                socket.emit("manager", { event: "kick" });
              }
            }
            break;
          case "user":
            switch (target.roomType) {
              case "all":
                user = await client.get(
                  `Agent:${AgentID}:Login:User:${target.target}`
                );
                user = JSON.parse(user);
                socketid = user.socketid;
                if (socketid.includes(socket.id)) {
                  socket.emit("manager", { event: "offline" });
                }
                break;
              case "room":
                user = await client.get(
                  `Agent:${AgentID}:Room:${target.room}:User`
                );
                user = JSON.parse(user);
                socketid = user[target.id];
                if (socketid.includes(socket.id)) {
                  socket.emit("manager", { event: "kick" });
                }
                break;
            }
            break;
        }
        break;
    }
  });

  socket.on("join", async (token, room) => {
    checkleave = false;
    let retData = await checkToken(token, socket.id);
    if (retData.check) {
      userSet[socket.id].room = room;
      // 加入公會對話
      let guildId = await client.get(`Agent:${AgentID}:Guild:${retData.id}`);
      guildId = JSON.parse(guildId);
      if (!Array.isArray(guildId) && guildId != null) {
        socket.join(guildId);
      } else {
        guildId = "";
      }
      // 加入socket房間
      socket.join(room);
      let update1 = `Agent:${AgentID}:Room:${room}:User`;
      let update2 = `Agent:${AgentID}:Room:${room}:Count`;
      let update3 = `Agent:${AgentID}:Login:User:${retData.id}`;
      let conRedis1 = await client.get(update1);
      conRedis1 = JSON.parse(conRedis1);
      let conRedis2 = await client.get(update2);
      conRedis2 = conRedis2;
      let conRedis3 = await client.get(update3);
      conRedis3 = JSON.parse(conRedis3);
      let ret1;
      let ret2;
      let ret3;
      if (conRedis1 == null) {
        ret1 = {};
        ret1[retData.id] = [socket.id];
        let emit = {
          event: "join",
          name: retData.name
        };
        console.log(emit.name + " join " + room);
      } else {
        if (conRedis1[retData.id] == undefined) {
          conRedis1[retData.id] = [socket.id];
          ret1 = conRedis1;
          let emit = {
            event: "join",
            name: retData.name
          };
          console.log(emit.name + " join " + room);
          socket.broadcast.to(room).emit("message", emit);
        } else {
          conRedis1[retData.id].push(socket.id);
          ret1 = conRedis1;
        }
      }
      if (conRedis3.room == undefined) {
        conRedis3.room = [room];
      } else if (!conRedis3.room.includes(room)) {
        conRedis3.room.push(room);
      }
      socket.emit("join", {
        name: retData.name,
        id: retData.id,
        guildId: guildId
      });
      // 取得房間內線上成員
      let currUsersID = Object.keys(socket.adapter.rooms[room].sockets);
      let currUsers = [];
      currUsersID.forEach(function(n) {
        if (!currUsers.includes(userSet[n].name)) {
          currUsers.push(userSet[n].name);
        }
      });
      let roomCount = currUsers.length;
      conRedis2 = roomCount;
      ret2 = conRedis2;
      await client.set(update1, JSON.stringify(ret1));
      await client.set(update2, ret2);
      await client.set(update3, JSON.stringify(conRedis3));
      emit = {
        currUsers: currUsers,
        roomCount: roomCount
      };
      io.in(room).emit("online", emit);
      let toManager = {
        event: "loginStatus",
        agentID: AgentID,
        room: room,
        roomCount: roomCount
      };
      pub.publish("ChatChannel3000", JSON.stringify(toManager));
      // 取得好友名單 & 邀請好友名單
      let temp = await client.get(`Agent:${AgentID}:Friend:${retData.id}`);
      temp = JSON.parse(temp);
      let ref = await client.get(`Agent:${AgentID}:Login:UserRef`);
      ref = JSON.parse(ref);
      let friendList = [];
      let toBeFriendList = [];
      let loginStatus = await client.get(`Agent:${AgentID}:Login:Status`);
      loginStatus = JSON.parse(loginStatus);
      if (temp != null) {
        for (let name of Object.keys(temp)) {
          let ret = {};
          let id = ref[name];
          ret.name = name;
          if (loginStatus.includes(id)) {
            ret.status = 1;
          } else {
            ret.status = 0;
          }
          if (temp[name] == 1) {
            friendList.push(ret);
          } else if (temp[name] == 0 || temp[name] == -1) {
            ret.type = temp[name];
            toBeFriendList.push(ret);
          }
        }
        let list = {
          friendList: friendList,
          toBeFriendList: toBeFriendList
        };
        socket.emit("getList", list);
      }
      // 更新好友登入狀態(新登入)
      if (conRedis3.socketid.length == 1) {
        let friend = await client.get(`Agent:${AgentID}:Friend:${retData.id}`);
        friend = JSON.parse(friend);
        let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
        nameToId = JSON.parse(nameToId);
        if (friend != null) {
          for (let name of Object.keys(friend)) {
            let id = nameToId[name];
            if (loginStatus.includes(id)) {
              let user = await client.get(`Agent:${AgentID}:Login:User:${id}`);
              user = JSON.parse(user);
              let socketid = user.socketid;
              for (let element of socketid) {
                let ret = {
                  event: "online",
                  name: retData.name,
                  type: friend[name]
                };
                socket.broadcast.to(element).emit("changeStatus", ret);
              }
            }
          }
        }
      }
    } else {
      let destination = "http://192.168.0.123";
      socket.emit("redirect", destination);
    }
  });

  socket.on("updateGuildInfo", async () => {
    let id = userSet[socket.id].id;
    let guild = await client.get(`Agent:${AgentID}:Guild:${id}`);
    guild = JSON.parse(guild);
    // let user = await client.get(`Agent:${AgentID}:Login:User:${id}`);
    // user = JSON.parse(user);
    // let socketid = user.socketid;
    if (Array.isArray(guild) || guild == null) {
      let guildList = await client.get(`Agent:${AgentID}:GuildList`);
      guildList = JSON.parse(guildList);
      guildApply = guild == null ? [] : guild;
      let ret = {
        event: "join",
        guildList: guildList,
        guildApply: guildApply
      };
      socket.emit("newGuildInfo", ret);
    } else {
      let guildInfo = await client.get(`Agent:${AgentID}:GuildInfo:${guild}`);
      guildInfo = JSON.parse(guildInfo);
      let ret = {
        event: "get",
        guildInfo: guildInfo
      };
      socket.emit("newGuildInfo", ret);
    }
  });

  socket.on("changeGuildName", async name => {
    let id = userSet[socket.id].id;
    let guildId = await client.get(`Agent:${AgentID}:Guild:${id}`);
    update = `Agent:${AgentID}:GuildInfo:${guildId}`;
    conRedis = await client.get(update);
    conRedis = JSON.parse(conRedis);
    conRedis.name = name;
    await client.set(update, JSON.stringify(conRedis));
    let con = await mysql2.createConnection(mysqlConnectionData);
    await con.execute("update guild_info set GuildName = ? where GuildNo = ?", [
      name,
      guildId
    ]);
  });

  socket.on("changeGuildPri", async guildChangeList => {
    let guildId = await client.get(
      `Agent:${AgentID}:Guild:${userSet[socket.id].id}`
    );
    let update = `Agent:${AgentID}:GuildInfo:${guildId}`;
    let conRedis = await client.get(update);
    let sql = "";
    conRedis = JSON.parse(conRedis);
    for (let member of Object.keys(guildChangeList)) {
      let user = await client.get(`Agent:${AgentID}:Login:User:${member}`);
      user = JSON.parse(user);
      if (user != null) {
        let socketid = user.socketid;
        socketid.forEach(element => {
          socket.broadcast
            .to(element)
            .emit("changePri", guildChangeList[member]);
        });
      }
      conRedis.memberList[member].privilege = guildChangeList[member];
      sql += `${member}:${guildChangeList[member]},`;
    }
    let con = await mysql2.createConnection(mysqlConnectionData);
    await con.execute("call update_guild_info(?)", [sql]);
    await client.set(update, JSON.stringify(conRedis));
  });

  socket.on("acceptGuildApply", async id => {
    let guildId = await client.get(
      `Agent:${AgentID}:Guild:${userSet[socket.id].id}`
    );
    let update = `Agent:${AgentID}:GuildInfo:${guildId}`;
    let conRedis = await client.get(update);
    conRedis = JSON.parse(conRedis);
    if (conRedis.memberList[id] == undefined) {
      let ret = {
        event: "error",
        errType: "applyAccept",
        msg: "該使用者已有所屬公會！"
      };
      socket.emit("message", ret);
    } else {
      conRedis.memberList[id].privilege = 2;
      conRedis.count++;
      await client.set(update, JSON.stringify(conRedis));
      await client.set(`Agent:${AgentID}:Guild:${id}`, guildId);
      let con = await mysql2.createConnection(mysqlConnectionData);
      await con.execute(
        "update guilds set Privilege = 2 where GuildNo = ? and UserID = ?",
        [guildId, id]
      );
      let user = await client.get(`Agent:${AgentID}:Login:User:${id}`);
      user = JSON.parse(user);
      if (user != null) {
        let socketid = user.socketid;
        socketid.forEach(element => {
          let target = io.sockets.connected[element];
          target.join(guildId);
          socket.broadcast.to(element).emit("changePri", 2);
        });
      }
    }
  });

  socket.on("kickOutGuild", async id => {
    let guildId = await client.get(
      `Agent:${AgentID}:Guild:${userSet[socket.id].id}`
    );
    let update = `Agent:${AgentID}:GuildInfo:${guildId}`;
    let conRedis = await client.get(update);
    conRedis = JSON.parse(conRedis);
    delete conRedis.memberList[id];
    conRedis.count--;
    await client.set(update, JSON.stringify(conRedis));
    await client.del(`Agent:${AgentID}:Guild:${id}`);
    let con = await mysql2.createConnection(mysqlConnectionData);
    await con.execute("delete from guilds where UserID = ?", [id]);
    let user = await client.get(`Agent:${AgentID}:Login:User:${id}`);
    user = JSON.parse(user);
    if (user != null) {
      let socketid = user.socketid;
      socketid.forEach(element => {
        let target = io.sockets.connected[element];
        target.leave(guildId);
        socket.broadcast.to(element).emit("changePri", -2);
      });
    }
  });

  socket.on("applyGuild", async guildId => {
    let id = userSet[socket.id].id;
    let con = await mysql2.createConnection(mysqlConnectionData);
    [rows, fields] = await con.execute(
      "insert into guilds (UserID, GuildNo, Privilege) values (?,?,-1)",
      [id, guildId]
    );
    let user = await client.get(`Agent:${AgentID}:Login:User:${id}`);
    user = JSON.parse(user);
    let socketid = user.socketid;
    socket.emit("appliedGuild", guildId);
    for (let element of socketid) {
      socket.broadcast.to(element).emit("appliedGuild", guildId);
    }
    let update1 = `Agent:${AgentID}:Guild:${id}`;
    let update2 = `Agent:${AgentID}:GuildInfo:${guildId}`;
    let conRedis1 = await client.get(update1);
    conRedis1 = JSON.parse(conRedis1);
    let conRedis2 = await client.get(update2);
    conRedis2 = JSON.parse(conRedis2);
    if (conRedis1 == null) {
      conRedis1 = [guildId];
    } else {
      conRedis1.push(guildId);
    }
    let ret = {
      name: userSet[socket.id].name,
      privilege: -1
    };
    conRedis2.memberList[id] = ret;
    await client.set(update1, JSON.stringify(conRedis1));
    await client.set(update2, JSON.stringify(conRedis2));
  });

  socket.on("createGuild", async newGuildName => {
    let GuildList = await client.get(`Agent:${AgentID}:GuildList`);
    GuildList = JSON.parse(GuildList);
    GuildList = GuildList.map(x => x.name);
    let id = userSet[socket.id].id;
    let name = userSet[socket.id].name;
    let applyGuildList = await client.get(`Agent:${AgentID}:Guild:${id}`);
    applyGuildList = JSON.parse(applyGuildList);
    if (!Array.isArray(applyGuildList)) {
      let ret = {
        event: "error",
        errType: "guildCreate",
        msg: "你已有所屬的公會！"
      };
      socket.emit("message", ret);
    } else if (GuildList.includes(newGuildName)) {
      let ret = {
        event: "error",
        errType: "guildName",
        msg: "該公會名稱已存在！"
      };
      socket.emit("message", ret);
    } else {
      for (let guild of applyGuildList) {
        let update1 = `Agent:${AgentID}:GuildInfo:${guild}`;
        let conRedis1 = await client.get(update1);
        conRedis1 = JSON.parse(conRedis1);
        delete conRedis1.memberList[id];
        await client.set(update1, JSON.stringify(conRedis1));
      }
      let con = await mysql2.createConnection(mysqlConnectionData);
      [rows, fields] = await con.execute("call create_guild(?,?)", [
        id,
        newGuildName
      ]);
      let guildID = rows[0][0]["@id"];
      let guildInfo = {
        name: newGuildName,
        master: {
          id: id,
          name: name
        },
        memberList: {
          [id]: {
            name: name,
            privilege: 0
          }
        }
      };
      let newGuild = {
        id: guildID,
        name: newGuildName,
        master: guildInfo.master,
        count: 1
      };
      let ret = {
        event: "get",
        guildInfo: guildInfo
      };
      socket.emit("newGuildInfo", ret);
      await client.set(`Agent:${AgentID}:Guild:${id}`, guildID);
      await client.set(
        `Agent:${AgentID}:GuildInfo:${guildID}`,
        JSON.stringify(guildInfo)
      );
      let update2 = `Agent:${AgentID}:GuildList`;
      let conRedis2 = await client.get(update2);
      conRedis2 = JSON.parse(conRedis2);
      conRedis2.push(newGuild);
      await client.set(update2, JSON.stringify(conRedis2));
    }
  });

  socket.on("inviteFriend", async invite => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let inter = new FromAndTo(
      nameToId[invite.fromName],
      nameToId[invite.toName],
      invite.fromName,
      invite.toName
    );
    let update1 = `Agent:${AgentID}:Friend:${inter.toId}`;
    let friendStatus1 = await client.get(update1);
    friendStatus1 = JSON.parse(friendStatus1);
    let update2 = `Agent:${AgentID}:Friend:${inter.fromId}`;
    let friendStatus2 = await client.get(update2);
    friendStatus2 = JSON.parse(friendStatus2);
    if (
      friendStatus1 != null &&
      Object.keys(friendStatus1).includes(inter.fromName)
    ) {
      if (friendStatus1[inter.fromName] == 0) {
        let retData = {
          event: "error",
          msg: "已邀請該使用者"
        };
        socket.emit("message", retData);
      } else if (friendStatus1[inter.fromName] == 1) {
        let retData = {
          event: "error",
          msg: "已跟該使用者成為好友"
        };
        socket.emit("message", retData);
      }
    } else {
      if (friendStatus1 == null) {
        friendStatus1 = {};
      }
      if (friendStatus2 == null) {
        friendStatus2 = {};
      }
      friendStatus1[inter.fromName] = 0;
      friendStatus2[inter.toName] = -1;
      socket.emit("invite", inter.toName);
      await client.set(update1, JSON.stringify(friendStatus1));
      await client.set(update2, JSON.stringify(friendStatus2));
      let sql =
        "insert into friends (UserID, RelatedUserID, TypeID) values (?,?,?),(?,?,?)";
      con.query(
        sql,
        [inter.toId, inter.fromId, 0, inter.fromId, inter.toId, -1],
        function(err, result) {
          if (err) throw err;
          console.log("2 records inserted");
        }
      );
      let toUser = await client.get(
        `Agent:${AgentID}:Login:User:${inter.toId}`
      );
      toUser = JSON.parse(toUser);
      for (let element of toUser.socketid) {
        socket.broadcast.to(element).emit("beInvited", inter.fromName);
      }
    }
  });

  socket.on("acceptFriend", async accept => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let inter = new FromAndTo(
      nameToId[accept.fromName],
      nameToId[accept.toName],
      accept.fromName,
      accept.toName
    );
    let update = `Agent:${AgentID}:Friend:${inter.toId}`;
    let temp = await client.get(update);
    temp = JSON.parse(temp);
    if (temp == null) {
      temp = {};
    }
    temp[inter.fromName] = 1;
    await client.set(update, JSON.stringify(temp));
    let sql =
      "insert into friends (UserID, RelatedUserID, TypeID) values (?,?,1)";
    con.query(sql, [inter.toId, inter.fromId], function(err, result) {
      if (err) throw err;
    });
    update = `Agent:${AgentID}:Friend:${inter.fromId}`;
    temp = await client.get(update);
    temp = JSON.parse(temp);
    temp[inter.toName] = 1;
    await client.set(update, JSON.stringify(temp));
    sql =
      "update friends set TypeID = 1 where UserID = ? and RelatedUserID = ?";
    con.query(sql, [inter.fromId, inter.toId], function(err, result) {
      if (err) throw err;
    });
    // 該使用者在線上
    let toUser = await client.get(`Agent:${AgentID}:Login:User:${inter.toId}`);
    toUser = JSON.parse(toUser);
    let ret = {};
    if (toUser != null) {
      let ret1 = {
        name: inter.fromName,
        status: 1
      };
      toUser.socketid.forEach(function(element) {
        socket.broadcast.to(element).emit("newFriend", ret1);
      });
      ret = {
        name: inter.toName,
        status: 1
      };
    } else {
      ret = {
        name: inter.toName,
        status: 0
      };
    }
    socket.emit("newFriend", ret);
  });

  socket.on("rejectFriend", async reject => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let inter = new FromAndTo(
      nameToId[reject.fromName],
      nameToId[reject.toName],
      reject.fromName,
      reject.toName
    );
    let update1 = `Agent:${AgentID}:Friend:${inter.fromId}`;
    let friend1 = await client.get(update1);
    let update2 = `Agent:${AgentID}:Friend:${inter.toId}`;
    let friend2 = await client.get(update2);
    friend1 = JSON.parse(friend1);
    friend2 = JSON.parse(friend2);
    delete friend1[inter.toName];
    await client.set(update1, JSON.stringify(friend1));
    delete friend2[inter.fromName];
    await client.set(update2, JSON.stringify(friend2));
    let sql =
      "delete from friends where (UserID = ? and RelatedUserID = ?) or (UserID = ? and RelatedUserID = ?)";
    con.query(
      sql,
      [inter.fromId, inter.toId, inter.toId, inter.fromId],
      function(err, result) {
        if (err) throw err;
      }
    );
    let toUser = await client.get(`Agent:${AgentID}:Login:User:${inter.toId}`);
    toUser = JSON.parse(toUser);
    // 該使用者在線上
    if (toUser != null) {
      let ret = {
        event: "reject",
        name: inter.fromName
      };
      for (let element of toUser.socketid) {
        socket.broadcast.to(element).emit("message", ret);
        socket.broadcast.to(element).emit("cancelInvite", inter.fromName);
      }
    }
    socket.emit("noFriend", inter.toName);
  });

  socket.on("deleteFriend", async del => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let inter = new FromAndTo(
      nameToId[del.fromName],
      nameToId[del.toName],
      del.fromName,
      del.toName
    );
    let update = `Agent:${AgentID}:Friend:${inter.fromId}`;
    let temp = await client.get(update);
    temp = JSON.parse(temp);
    delete temp[inter.toName];
    await client.set(update, JSON.stringify(temp));
    update = "Agent:" + AgentID + ":Friend:" + inter.toId;
    temp = await client.get(update);
    temp = JSON.parse(temp);
    delete temp[inter.fromName];
    await client.set(update, JSON.stringify(temp));
    let sql =
      "delete from friends where (UserID = ? and RelatedUserID = ?) or (UserID = ? and RelatedUserID = ?)";
    con.query(
      sql,
      [inter.fromId, inter.toId, inter.toId, inter.fromId],
      function(err, result) {
        if (err) throw err;
      }
    );

    let toUser = await client.get(`Agent:${AgentID}:Login:User:${inter.toId}`);
    toUser = JSON.parse(toUser);
    // 該使用者在線上
    if (toUser != null) {
      let ret1 = {
        event: "delete",
        name: inter.fromName
      };
      let ret2 = {
        name: inter.toName,
        status: 0
      };
      toUser.socketid.forEach(function(element) {
        socket.broadcast.to(element).emit("notFriend", inter.fromName);
        socket.broadcast.to(element).emit("message", ret1);
      });
    } else {
      let ret2 = {
        name: inter.toName,
        status: 0
      };
    }
    socket.emit("notFriend", inter.toName);
  });

  socket.on("cancelInvite", async cancel => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let inter = new FromAndTo(
      nameToId[cancel.fromName],
      nameToId[cancel.toName],
      cancel.fromName,
      cancel.toName
    );
    let update1 = `Agent:${AgentID}:Friend:${inter.fromId}`;
    let friend1 = await client.get(update1);
    let update2 = `Agent:${AgentID}:Friend:${inter.toId}`;
    let friend2 = await client.get(update2);
    friend1 = JSON.parse(friend1);
    friend2 = JSON.parse(friend2);
    delete friend1[inter.toName];
    await client.set(update1, JSON.stringify(friend1));
    delete friend2[inter.fromName];
    await client.set(update2, JSON.stringify(friend2));
    let sql =
      "delete from friends where (UserID = ? and RelatedUserID = ?) or (UserID = ? and RelatedUserID = ?)";
    con.query(
      sql,
      [inter.fromId, inter.toId, inter.toId, inter.fromId],
      function(err, result) {
        if (err) throw err;
      }
    );
    let toUser = await client.get(`Agent:${AgentID}:Login:User:${inter.toId}`);
    toUser = JSON.parse(toUser);
    // 該使用者在線上
    if (toUser != null) {
      for (let element of toUser.socketid) {
        socket.broadcast.to(element).emit("cancelInvite", inter.fromName);
      }
    }
    socket.emit("cancelInvite", inter.toName);
  });

  socket.on("say", async msg => {
    console.log("Received Message: " + msg.msg);
    let ret = await getUrlInfo(msg.msg);
    let urlType = 0;
    if (ret.success == true) {
      let img = ret.data.ogImage;
      if (ret.data.hasOwnProperty("ogVideo")) {
        urlType = 3;
      } else if (img.length == 0) {
        urlType = 1;
      } else {
        urlType = 2;
      }
    }
    let retData = {
      event: "msg",
      name: msg.name,
      msg: msg.msg,
      url: ret,
      urlType: urlType,
      type: msg.type
    };
    io.in(msg.room).emit("message", retData);
  });

  socket.on("whisper", async msg => {
    let nameToId = await client.get(`Agent:${AgentID}:Login:UserRef`);
    nameToId = JSON.parse(nameToId);
    let id = nameToId[msg.target];
    let loginStatus = await client.get(
      "Agent:" + AgentID + ":Login:User:" + id
    );
    loginStatus = JSON.parse(loginStatus);
    let ret = await getUrlInfo(msg.msg);
    // 檢查該用戶是否存在或在線上
    if (loginStatus == null) {
      let retData = {
        event: "error",
        msg: "使用者 " + msg.target + " 不存在或不在線上！"
      };
      socket.emit("message", retData);
    } else {
      let retData1 = {
        event: "whisper",
        name: msg.name,
        msg: msg.msg,
        url: ret.success ? ret : null,
        urlType: urlType
      };
      loginStatus.socketid.forEach(function(element) {
        socket.broadcast.to(element).emit("message", retData1);
      });
      let retData2 = {
        event: "response",
        name: msg.target,
        msg: msg.msg,
        url: ret.success ? ret : null,
        urlType: urlType
      };
      socket.emit("message", retData2);
    }
  });

  socket.on("leave", async () => {
    if (userSet[socket.id] != undefined) {
      console.log("by leave");
      checkleave = true;
      let room = userSet[socket.id].room;
      let name = userSet[socket.id].name;
      let id = userSet[socket.id].id;
      socket.leave(room);
      // 退出公會對話
      let guildId = await client.get(`Agent:${AgentID}:Guild:${id}`);
      guildId = JSON.parse(guildId);
      if (!Array.isArray(guildId) && guildId != null) {
        socket.leave(guildId);
      }
      // 更新使用者登入狀態
      let update1 = `Agent:${AgentID}:Login:UserRef`;
      let conRedis1 = await client.get(update1);
      conRedis1 = JSON.parse(conRedis1);
      let update2 = "Agent:" + AgentID + ":Login:Status";
      let conRedis2 = await client.get(update2);
      conRedis2 = JSON.parse(conRedis2);
      let update3 = `Agent:${AgentID}:Login:User:${id}`;
      let conRedis3 = await client.get(update3);
      conRedis3 = JSON.parse(conRedis3);
      if (conRedis3.socketid.length == 1) {
        let index = conRedis2.indexOf(id);
        conRedis2.splice(index, 1);
        await client.set(update2, JSON.stringify(conRedis2));
        delete conRedis1[name];
        await client.set(update1, JSON.stringify(conRedis1));
        await client.del(update3);
        conRedis3 = null;
      } else {
        let index = conRedis3.socketid.indexOf(socket.id);
        conRedis3.socketid.splice(index, 1);
      }
      // 更新好友登入狀態
      if (conRedis3 == null) {
        let friend = await client.get(`Agent:${AgentID}:Friend:${id}`);
        friend = JSON.parse(friend);
        if (friend != null) {
          for (let element1 of Object.keys(friend)) {
            let userId = conRedis1[element1];
            if (conRedis2.includes(userId)) {
              let user = await client.get(
                `Agent:${AgentID}:Login:User:${userId}`
              );
              user = JSON.parse(user);
              let socketid = user.socketid;
              for (let element2 of socketid) {
                let ret = {
                  event: "offline",
                  name: name,
                  type: friend[element1]
                };
                socket.broadcast.to(element2).emit("changeStatus", ret);
              }
            }
          }
        }
      }
      // 更新房間使用者
      update1 = `Agent:${AgentID}:Room:${room}:User`;
      update2 = `Agent:${AgentID}:Room:${room}:Count`;
      conRedis1 = await client.get(update1);
      conRedis1 = JSON.parse(conRedis1);
      conRedis2 = await client.get(update2);
      if (conRedis1 != null) {
        if (conRedis1[id].length == 1) {
          delete conRedis1[id];
          if (conRedis3 != null) {
            if (conRedis3.room.length == 1) {
              delete conRedis3.room;
            } else {
              let index = conRedis3.room.indexOf(room);
              conRedis3.room.splice(index, 1);
            }
          }
          let retData = {
            event: "leave",
            name: name
          };
          console.log(name + " leave " + room);
          socket.broadcast.to(room).emit("message", retData);
        } else {
          let index = conRedis1[id].indexOf(socket.id);
          conRedis1[id].splice(index, 1);
        }
        await client.set(update3, JSON.stringify(conRedis3));
        // 取得房間內線上成員
        let roomCount = 0;
        if (socket.adapter.rooms[room] != undefined) {
          let currUsersID = Object.keys(socket.adapter.rooms[room].sockets);
          let currUsers = [];
          currUsersID.forEach(function(n) {
            if (!currUsers.includes(userSet[n].name)) {
              currUsers.push(userSet[n].name);
            }
          });
          roomCount = currUsers.length;
          emit = {
            currUsers: currUsers,
            roomCount: roomCount
          };
          io.in(room).emit("online", emit);
        }
        conRedis2 = roomCount;
        await client.set(update1, JSON.stringify(conRedis1));
        await client.set(update2, conRedis2);
        let toManager = {
          event: "loginStatus",
          agentID: AgentID,
          room: room,
          roomCount: roomCount
        };
        pub.publish("ChatChannel3000", JSON.stringify(toManager));
      }
    }
  });

  socket.on("offline", async token => {
    await client.del(token);
  });

  socket.on("disconnect", async () => {
    if (
      userSet[socket.id] != undefined &&
      userSet[socket.id].name != undefined
    ) {
      if (checkleave == false) {
        checkleave = true;
        let room = userSet[socket.id].room;
        let name = userSet[socket.id].name;
        let id = userSet[socket.id].id;
        socket.leave(room);
        // 退出公會對話
        let guildId = await client.get(`Agent:${AgentID}:Guild:${id}`);
        guildId = JSON.parse(guildId);
        if (!Array.isArray(guildId) && guildId != null) {
          socket.leave(guildId);
        }
        // 更新使用者登入狀態
        let update1 = `Agent:${AgentID}:Login:UserRef`;
        let conRedis1 = await client.get(update1);
        conRedis1 = JSON.parse(conRedis1);
        let update2 = "Agent:" + AgentID + ":Login:Status";
        let conRedis2 = await client.get(update2);
        conRedis2 = JSON.parse(conRedis2);
        let update3 = `Agent:${AgentID}:Login:User:${id}`;
        let conRedis3 = await client.get(update3);
        conRedis3 = JSON.parse(conRedis3);
        if (conRedis3.socketid.length == 1) {
          let index = conRedis2.indexOf(id);
          conRedis2.splice(index, 1);
          await client.set(update2, JSON.stringify(conRedis2));
          delete conRedis1[name];
          await client.set(update1, JSON.stringify(conRedis1));
          await client.del(update3);
          conRedis3 = null;
        } else {
          let index = conRedis3.socketid.indexOf(socket.id);
          conRedis3.socketid.splice(index, 1);
        }
        // 更新好友登入狀態
        if (conRedis3 == null) {
          let friend = await client.get(`Agent:${AgentID}:Friend:${id}`);
          friend = JSON.parse(friend);
          if (friend != null) {
            for (let element1 of Object.keys(friend)) {
              let userId = conRedis1[element1];
              if (conRedis2.includes(userId)) {
                let user = await client.get(
                  `Agent:${AgentID}:Login:User:${userId}`
                );
                user = JSON.parse(user);
                let socketid = user.socketid;
                for (let element2 of socketid) {
                  let ret = {
                    event: "offline",
                    name: name,
                    type: friend[element1]
                  };
                  socket.broadcast.to(element2).emit("changeStatus", ret);
                }
              }
            }
          }
        }
        // 更新房間使用者
        update1 = `Agent:${AgentID}:Room:${room}:User`;
        update2 = `Agent:${AgentID}:Room:${room}:Count`;
        update3 = `Agent:${AgentID}:Login:User:${id}`;
        conRedis1 = await client.get(update1);
        conRedis1 = JSON.parse(conRedis1);
        conRedis2 = await client.get(update2);
        if (conRedis1 != null) {
          if (conRedis1[id].length == 1) {
            delete conRedis1[id];
            if (conRedis3 != null) {
              if (conRedis3.room.length == 1) {
                delete conRedis3.room;
              } else {
                let index = conRedis3.room.indexOf(room);
                conRedis3.room.splice(index, 1);
              }
              await client.set(update3, JSON.stringify(conRedis3));
            }
            let retData = {
              event: "leave",
              name: name
            };
            console.log(name + " leave " + room);
            socket.broadcast.to(room).emit("message", retData);
          } else {
            let index = conRedis1[id].indexOf(socket.id);
            conRedis1[id].splice(index, 1);
          }
          // 取得房間內線上成員
          let roomCount = 0;
          if (socket.adapter.rooms[room] != undefined) {
            let currUsersID = Object.keys(socket.adapter.rooms[room].sockets);
            let currUsers = [];
            currUsersID.forEach(function(n) {
              if (!currUsers.includes(userSet[n].name)) {
                currUsers.push(userSet[n].name);
              }
            });
            roomCount = currUsers.length;
            emit = {
              currUsers: currUsers,
              roomCount: roomCount
            };
            io.in(room).emit("online", emit);
          }
          conRedis2 = roomCount;
          await client.set(update1, JSON.stringify(conRedis1));
          await client.set(update2, conRedis2);
          let toManager = {
            event: "loginStatus",
            agentID: AgentID,
            room: room,
            roomCount: roomCount
          };
          pub.publish("ChatChannel3000", JSON.stringify(toManager));
        }
      }
    }
  });
});

server.listen(3000, () => {
  console.log("Server Started. http://localhost:3000");
});
