import Vue from "vue";
import Router from "vue-router";
import index from "@/components/index";
import chatroom1 from "@/components/chatroom1";
import chatroom2 from "@/components/chatroom2";

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: "/",
      name: "index",
      component: index
    },
    {
      path: "/chatroom1",
      name: "chatroom1",
      component: chatroom1
    },
    {
      path: "/chatroom2",
      name: "chatroom2",
      component: chatroom2
    }
  ]
});
