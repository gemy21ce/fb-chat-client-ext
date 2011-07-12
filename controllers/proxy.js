/**
 * static proxy configurations.
 */
var Proxy={
    /**
     * proxy base url.
     */
    baseURL:'http://fbchat1.activedd.com',
//    baseURL:'http://41.130.147.16:8080/FBChatProxy',
    chatURL:'http://chat.activedd.com/chat/',
    graphApiURL:'https://graph.facebook.com',
    /**
     * first time login url.
     */
    loginURL:'/login/login.htm',
    /**
     * after first login check for session key and user id url.
     */
    checkAuthURL:'/login/getauthkey.htm',
    /**
     * connect and go online.
     */
    connectURL:'/newconnect/connect.htm',
    /**
     * disconnects from facebook and go offline.
     */
    disconnectURL:'/newconnect/disconnect.htm',
    /**
     * the json file of user recent chat url.
     */
    messagesURL:'/chat/',
    /**
     * sending a chat message url, param:to( the reciever id), msg( the message),from (user id).
     */
    sendMessageURL:'/newmessaging/send.htm',
    /**
     * update the list of online users, param: uid(user id).
     */
    onlineUsersURL:'/newmessaging/onlinefriends.htm',
    /**
     * get a list of friends, param: uid(user id).
     */
    listOfUsersURL:'/newmessaging/friendlist.htm',
    /**
     *  graph api get logged user info via graph api.
     * @param access_token stored session key.
     */
    graphUserInfoURL:'/me?access_token=',
    /**
     *  get the list of friends list
     *  @param access_token stored session key.
     */
    graphFriendListsURL:'/me/friendlists?access_token=',
    /**
     *  get the list of friends.
     *  @param access_token stored session key.
     */
    graphFriendsURL:'/me/friends?access_token=',
    /**
     * get the authentication token/session key, keep doing it for about 10 minuts every 10 seconds.
     */
    Authenticate:function(count){
        if(! count){
            count=0;
        }
        count=parseInt(count);
        if(count == 29){
            window.localStorage.logged=false;
            return;
        }
        try{
            $.ajax({
                url:Proxy.baseURL+Proxy.checkAuthURL,
                dataType:'json',
                success:function(res){
                    if((! res || ! res.sessionkey) && count < 60){
                        window.setTimeout(function(){
                            Proxy.Authenticate(count+1);
                        }, 1000 * 2);
                    }else{
                        window.localStorage.sessionKey=res.sessionkey;
                        window.localStorage.logged=true;
                        fbchatbg.popup.logged=true;
                        fbchatbg.setExtensionSettings();
                        fbchatbg.connect(function(){
                            chrome.extension.getViews({
                                type:"popup"
                            }).forEach(function(win){
                                win.fbchatpopup.disposableFunctions.afterConnectingSuccess(callbackParam);
                            });
                        });
                    }
                },
                error:function(){
                    if(count < 60){
                        window.setTimeout(function(){
                            Proxy.Authenticate(count+1);
                        }, 1000 * 2);
                    }
                }
            });
        }catch (e){
            window.setTimeout(function(){
                Proxy.Authenticate(count+1);
            }, 1000 * 2);
        }
        
    },
    /**
     * go online :).
     */
    connect:function(handler,failer){
        if(! JSON.parse(window.localStorage.logged) || (! window.localStorage.sessionKey)){
            return;
        }
        console.log('connecting')
        $.ajax({
            url:Proxy.baseURL+Proxy.connectURL,
            dataType:'json',
            data:{
                "sessionkey":window.localStorage.sessionKey
            },
            type:'POST',
            success:function(usr){
                if(usr.status && usr.status != 200){
                    //status 400 or 407
                    console.log(usr.message)
                    failer();
                }else{
                    //TO DO: after login function
                    handler(usr);
                }
            },
            error:function(jqXHR, textStatus, errorThrown){
                if(jqXHR && jqXHR.status == 500){
                    window.localStorage.logged = false;
                }
                console.log(errorThrown)
                failer();
            }
        })
    },
    /**
     * disconnect from facebook chat and go offline.
     */
    disconnect:function(){
        $.ajax({
            url:Proxy.baseURL+Proxy.disconnectURL,
            dataType:'json',
            success:function(){
                console.log('disconnected');
            }
        });
    },
    /**
     * send a chat message.
     */
    sendMessage:function(to,msg,handler){
        $.ajax({
            url:Proxy.baseURL+Proxy.sendMessageURL,
            data:{
                to:to,
                msg:msg
            },
            dataType:'json',
            type:'POST',
            success:function(res){
                handler(res);
            }
        });
    },
    /**
     * get a list of online friends
     */
    getOnlineFriends:function(handler,failer){
        //new fb api
        /*var sessionKey = window.localStorage.sessionKey;
        if(! sessionKey){
            failer();
            return;
        }*/
        /*
        fbchatdb.getAllFriends(function(list){

            var friendList=[];
            try{
                function recursiveStatusUpdate(index){
                    FB.api({
                        method: 'fql.query',
                        query: "SELECT uid,online_presence,name FROM user WHERE  uid ="+list[index].uid,
                        access_token:sessionKey
                    },function(data){
                        friendList = friendList.concat(data);
                        if(list.length >  index +1){
                            recursiveStatusUpdate(index+1);
                        }else{
                            console.log(friendList)
                            handler(friendList);
                        }
                    });
                }
                recursiveStatusUpdate(0);
            }catch(e){
                console.log(e);
                failer();
                return;
            }
        });*/
        //old one depends on server.
        $.ajax({
            url:Proxy.baseURL+Proxy.onlineUsersURL,
            dataType:'json',
            success:function(list){
                delete window.localStorage.errorConnecting;
                handler(list);
            },
            complete:function(jqXHR, textStatus){
                if(jqXHR && jqXHR.status == 404){
                    if(window.localStorage.errorConnecting){
                        fbchatbg.disconnect();
                    }else{
                        window.localStorage.errorConnecting=1;
                    }
                }
            },
            error:function(jqXHR, textStatus, errorThrown){
                console.log(errorThrown)
                failer();
            }
        });
    },
    /**
     *
     */
    getFriendsList:function(handler,failer){
        // modification according to new graph api in version 1.4
        var sessionKey = window.localStorage.sessionKey;
        if(! sessionKey){
            failer();
            return;
        }
        $.ajax({
            url:Proxy.graphApiURL+Proxy.graphFriendsURL+sessionKey,
            dataType:'json',
            success:function(list){
                handler(list.data)
            },
            error:function(jqXHR, textStatus, errorThrown){
                console.log(errorThrown)
                failer();
            }
        })
    //in case we are categorizing the friends as fb friends lists.
    /*
        $.ajax({
            url:Proxy.graphApiURL+Proxy.graphFriendListsURL+sessionKey,
            dataType:'json',
            success:function(lst){
                var friendList=[];
                function recusiveAjaxCall(index){
                    $.ajax({
                        url:Proxy.graphApiURL+lst.data[index].id+'/members?access_token='+sessionKey,
                        dataType:'json',
                        success:function(list){
                            friendList=friendList.concat(list.data);
                            if(lst.length > index +1){
                                recusiveAjaxCall(index +1);
                            }else{
                                handler(friendList);
                            }
                        },
                        error:function(jqXHR, textStatus, errorThrown){
                            console.log(errorThrown)
                            failer();
                        }
                    })
                }
                recusiveAjaxCall(0);
            }
        });
        */
    //old method
    /*$.ajax({
            url:Proxy.baseURL+Proxy.listOfUsersURL,
            dataType:'json',
            success:function(list){
                handler(list);
            },
            error:function(jqXHR, textStatus, errorThrown){
                console.log(errorThrown)
                failer();
            }
        });*/
    },
    /**
     *
     */
    getMessages:function(uid,handler,failer){
        try{
            $.ajax({
                url:Proxy.chatURL+uid+'.json',
                dataType:'json',
                cache:'false',
                ifModified:'true',
                statusCode:{
                    200:function(msgs){
                        console.log("200");
                        console.log(JSON.stringify(msgs));
                    },
                    304:function(){
                        console.log('304');
                    }
                },
                complete:function(jqXHR, textStatus){
                    if(jqXHR && jqXHR.status == 200){
                        var msgs=JSON.parse(jqXHR.response);
                        handler(msgs);
                    }
                }
            });
        }catch(e){
            console.log(e);
            failer();
        }
    },
    /**
     *
     */
    loggedUserInfo:function(fn,error){
        var sessionKey = window.localStorage.sessionKey;
        if(! sessionKey){
            error();
            return;
        }
        try{
            $.ajax({
                url:Proxy.graphApiURL+Proxy.graphUserInfoURL+sessionKey,
                dataType:'json',
                cache:'false',
                success:function(usr){
                    fn(usr)
                }
            });
        }catch(e){
            console.log(e);
            error();
        }
    }
}
