/* Authors

Jan 2018-Current
Sonali Tandon

Jan 2018-June 2018
Puhe Liang
Saebom Kwon
Jacob Berman
Paiju Chang

*/

// poll frequently to check first if URL is changed - avoid calling Twitter API
var jsTimerForURLChange = setInterval(checkForJS_Finish, 10000);
//call checkForJS_Finish() as init()
window.onload = checkForJS_Finish()
var userID;
var item, abusive_list; // jSON returned from server. Making it public for highlighting abusive words on lazy loading
var stranger_list = [];
var response_json = {}
var flagged_tweets_tab;
var flagged_tweets_flag = false;
//keep track of currentPage
var currentPage = window.location.href;
//global variables common to hometimeline/notificationtweets
var global_tweetcount = 0;
var flagged_posts =[]
var flagged_tweets =[]

//generic functionality that sends a bunch of tweets for prediction
function sendPostsToPredict(){

  var tweets = document.querySelectorAll(".tweet-text");
  var tweets_text = []
  ////console.log('Global tweet count' + global_tweetcount)
  ////console.log('Tweet queried length' + tweets.length)

    if(tweets.length > global_tweetcount){
      ////console.log(tweets)

      global_tweetcount = tweets.length;
       for(i=0;i<tweets.length;i++){
      // clean URL to form JSON parameters
      temp = tweets[i].innerText.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
      temp =  temp.replace(/\W+/g," ")
      tweets_text.push({"text":temp})
    }

    ////console.log('Preprocessed text length' +tweets_text.length)

      var url = "https://127.0.0.1:5000/predict?tweets=" + JSON.stringify(tweets_text);

      //is it not picking up on time? is 3000 too short?
      var request = new XMLHttpRequest();
      request.onreadystatechange = function() {
        if (request.readyState == 4 && request.status == 200) {
          response_json = JSON.parse(request.responseText);
          flagged_tweets = response_json.flagged_tweets;
          highlightAbusivePosts(response_json.flagged_tweets);
        }
      };
      request.open('GET', url);
      request.send();
      }
    }

function getPostsFromHomeTimeline(){
   // changeProfileStats()

    sendPostsToPredict()
   // sendUsersToPredict()

}

function getPostsFromNotificationTimeline(){
    sendPostsToPredict()
  //  sendUsersToPredict()
}

function sendUsersToPredict(){
    var list = document.querySelectorAll("div.stream-item-header");
    //console.log(list.length)
    for(i=0;i<list.length;i++){
      let username = list[i].querySelector("a > .username.u-dir.u-textTruncate");
      if(username){
      //  console.log(username.innerText.substring(1,username.length));
        get_score(username.innerText.substring(1,username.length),highlightUser,list[i])

      }
    }
}

function get_score(username,callback,domelement = false) {
    var url = "http://127.0.0.1:5000/abusivescore?user=" + username;
    var request = new XMLHttpRequest();
    request.onreadystatechange = function()
    {
        if (request.readyState == 4 && request.status == 200)
        {
            callback(request.responseText, domelement); // Another callback here
        }
    };
    request.open('GET', url);
    request.send();
}

function highlightUser(response_json, domelement){
  response_json = JSON.parse(response_json);
  console.log('highlightUser  ' + response_json.screen_name + ' ' + response_json.user_consensus_score);
  if(response_json.user_consensus_score> 0.4){
    domelement.querySelector("a > img.avatar.js-action-profile-avatar").style.border = '4px solid rgb(252, 66, 123)';
  }


}

function checkabusive(data) {
  response_json = JSON.parse(data);
  flagged_tweets = response_json.flagged_tweets
  changeBio(response_json)
  highlightAbusivePosts(response_json.flagged_tweets)
}

function changeProfileStats(data) {
  response_json = JSON.parse(data);
  user_consensus_score = response_json.user_consensus_score;
  var profileStats = document.querySelector(".ProfileCardStats-statLabel.u-block");
    if(profileStats){
            profileStats.innerText = 'Abusive Score';
      profileStats.style.color = 'rgb(252, 66, 123)';

    }

   if(document.querySelector(".ProfileCardStats-statValue"))
      document.querySelector(".ProfileCardStats-statValue").innerText = user_consensus_score.toFixed(2);
     document.querySelector(".ProfileCardStats-statValue").style.color = 'rgb(252, 66, 123)'
}

function addTab(){
  if(!document.querySelector('ProfileHeading-toggleLink js-nav flagged-tweets')){
    let tab_header = document.querySelector('.ProfileHeading-toggle')
    let new_tab = document.createElement('li')
    new_tab.className = "ProfileHeading-toggleItem  u-textUserColor"
    let new_href = document.createElement('button')
    new_href.className = "ProfileHeading-toggleLink js-nav flagged-tweets"
    new_href.innerText = "Flagged Tweets"
    new_tab.appendChild(new_href)
    tab_header.appendChild(new_tab)
  }



}

function get_score_notif(userIDNode) {
  var url = "http://127.0.0.1:5000/tpi?user=" + userIDNode.innerText + "&numberTwit=200";
  ////console.log(url);
  var request = new XMLHttpRequest();
  request.onreadystatechange = function() {
    if (request.readyState == 4 && request.status == 200) {
      let stranger_item = JSON.parse(request.responseText);
      ////console.log(stranger_item.yes_no);
      if (stranger_item.yes_no == true) {
        changeNameHeader(userIDNode);
      }
    }
  };
  request.open('GET', url);
  request.send();
}

function changeNameHeader(userIDNode) {
  var warningNotification = document.createElement('span');
  warningNotification.innerText = " WARNING! Potentially Abusive";
  warningNotification.id = "warning";
  userIDNode.appendChild(warningNotification);
}

function findUserId(document) {
  let userId = document.querySelector(".ProfileHeaderCard-screennameLink > span > b");
  return userId.innerText;
}

function checkNotifUserId(document) {
  let container = document.querySelector(".stream");
  let items = container.querySelectorAll(".account-group");
  items.forEach(function(element) {
    let userIDNode = element.querySelector(".account-group .username > b");
    if (!stranger_list.includes(userIDNode.innerText)) {
      stranger_list.push(userIDNode.innerText);
      ////console.log(userIDNode.innerText);
      get_score_notif(userIDNode);
    }
  });
}

function highlightAbusivePosts(flagged_tweets) {

  var alltweets = document.querySelectorAll(".tweet-text");

  for (i = 0; i < alltweets.length; i++) {
    var tweet = alltweets[i].innerText;
    tweet = tweet.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
    tweet = tweet.replace(/\W+/g, " ")
    tweet = tweet.toLowerCase().trim()
    //console.log(flagged_tweets)
    for (j = 0; j < flagged_tweets.length; j++) {
      if (document.querySelector(".ProfileAvatar"))
        document.querySelector(".ProfileAvatar").style.borderColor = "rgb(252, 66, 123)";
      if (flagged_tweets[j].includes(tweet)) {

        alltweets[i].style.backgroundColor = "rgba(252, 66, 123,0.1)"
        // if(document.querySelector(".avatar.js-action-profile-avatar"))
        // alltweets[i].parentElement.parentElement.firstElementChild.firstElementChild.firstElementChild.style.border = '3px solid rgb(252, 66, 123)';


        // if(document.getElementById('model-tag-'+j)==null){
        //   var model_tags = document.createElement('span')
        //   model_tags.innerHTML = flagged_tweets[j].models_that_agree
        //   model_tags.id = "model-tag-"+j
        //   model_tags.style.color =  "#e0245e"
        //   //////console.log(model_tags)
        //   var parent = alltweets[i].parentElement.parentElement.firstElementChild.children[1]
        //   parent.appendChild(model_tags)
        // }
      } else {
        // if(flagged_tweets_flag){
        //   //console.log(alltweets[i].parentElement.parentElement.parentElement)
        //   alltweets[i].parentElement.parentElement.parentElement.remove()
        // }
      }
    }
    flagged_tweets_flag = false
  }
}

function checkForJS_Finish() {

  console.log("Called here")

 if(currentPage != window.location.href)     {
  currentPage = window.location.href

  if (document.querySelector(".ProfileHeaderCard-bio")) {
    if (document.querySelector(".ProfileHeaderCard-screennameLink > span > b").innerText != userID){
      userID = findUserId(document);
      get_score(userID, checkabusive);
      addTab()
    }
    }
      if (document.querySelector(".home.active")) {
        global_tweetcount = 0
        getPostsFromHomeTimeline();
    }

      if (document.querySelector(".NotificationsHeadingContent")) {
        global_tweetcount = 0
        getPostsFromNotificationTimeline();
        addTab()
    }
  }

  // keep polling on timeline/notification page - as this loads only first 5 tweets on URL change
  if (document.querySelector(".home.active")) {
        getPostsFromHomeTimeline();
    }
      if (document.querySelector(".NotificationsHeadingContent")) {
        getPostsFromNotificationTimeline();
    }
}

function changeBio(response_json){
  userID = document.querySelector(".ProfileHeaderCard-nameLink").innerText;

  var originalDiv = document.getElementsByClassName("ProfileHeaderCard-screenname");
  var parents = document.getElementsByClassName("AppContent-main content-main u-cf");
  parents[0].setAttribute("style", "margin-top:50px;");

  if (! document.getElementById("bio-box")) {
    // Parent Element
    var biobox = document.createElement("DIV");
    originalDiv[0].insertAdjacentElement("afterend", biobox);
    biobox.id = "bio-box";

    // Title
    var biobox_title = document.createElement("DIV");
    biobox.appendChild(biobox_title);
    biobox_title.className = "panel panel-default";

    // Title Body
    var biobox_title_body = document.createElement("DIV");
    biobox_title.appendChild(biobox_title_body);
    biobox_title_body.className = "panel-body";

    // Box
    var charbox = document.createElement("DIV");
    biobox_title_body.appendChild(charbox);
    charbox.id = "char-box";

    var biobox_char = document.createElement("P");
    charbox.appendChild(biobox_char);
    biobox_char.id = "bio-box-text";
    biobox_char.innerHTML = "Abusive score: " + response_json.user_consensus_score.toFixed(2) + '</br>' + "Number of tweets flagged : " + response_json.flagged_tweets.length+  " of " + response_json.number_of_tweets_considered;
    biobox_char.style.color = '#FC427B';

  }
}


function changeAvi() {
  let container = document.getElementsByClassName("ProfileAvatar-container")[0];      //Get parent of Profile Avatar
  let avi = document.getElementsByClassName("ProfileAvatar-image");                   //Get current avatar if you want to modify it at all
  var clone = document.createElement("img");                                          // Create image that will be the overlay
  clone.classList.add("ProfileAvatar-image");
  clone.src = chrome.extension.getURL("bad-mouth.png");
  clone.style.opacity = "0.9";
  container.appendChild(clone);
}


//listens for onclick of flagged tweets
flagged_tweets_tab = document.querySelector(".ProfileHeading-toggleLink.js-nav.flagged-tweets");

flagged_tweets_tab.addEventListener('click',function(){

  //deactivate active tab
  if(flagged_tweets_tab.parentElement.parentElement.children.length){
    var childrenElements = flagged_tweets_tab.parentElement.parentElement.children;
    for(i=0;i<childrenElements.length;i++){
      if(childrenElements[i].classList.contains("is-active")){
        childrenElements[i].classList.remove("is-active")
         childrenElements[i].classList.add("u-textUserColor")
      }
    }
  }

  //activate flagged tweets button
  flagged_tweets_tab.parentElement.classList.add("is-active");
  flagged_tweets_tab.parentElement.classList.remove("u-textUserColor");

  //console.log('here')
  flagged_posts =[]

  var alltweets = document.querySelectorAll(".tweet-text");
  console.log(alltweets.length)
  console.log(flagged_tweets.length)


  for(i=0;i<alltweets.length;i++){
    var tweet = alltweets[i].innerText;
    tweet = tweet.replace(/(?:https?|www):\/\/[\n\S]+/g, '')
    tweet =tweet.replace(/\W+/g," ")
    tweet = tweet.toLowerCase().trim()
    //console.log(flagged_tweets)
    for(j=0;j<flagged_tweets.length;j++){
      if(flagged_tweets[j].includes(tweet)){

          flagged_posts.push(alltweets[i].closest(".js-stream-item.stream-item.stream-item"))
        // if(document.getElementById('model-tag-'+j)==null){
        //   var model_tags = document.createElement('span')
        //   model_tags.innerHTML = flagged_tweets[j].models_that_agree
        //   model_tags.id = "model-tag-"+j
        //   model_tags.style.color =  "#e0245e"
        //   //////console.log(model_tags)
        //   var parent = alltweets[i].parentElement.parentElement.firstElementChild.children[1]
        //   parent.appendChild(model_tags)
        // }
      }
}
}

    console.log(flagged_posts)

  if(document.querySelector("#stream-items-id"))
  {

    var element = document.getElementById("stream-items-id");
    parentNode = element.parentNode
    element.parentNode.removeChild(element);

    // looping through children wasnt removing all posts
    var reCreateElement = document.createElement("ol");
   // reCreateElement.id = "stream-items-id";
    reCreateElement.className ="stream-items js-navigable-stream";
    parentNode.insertBefore(reCreateElement, parentNode.firstChild);
    if(document.querySelector(".timeline-end.has-items.has-more-items"))
      document.querySelector(".timeline-end.has-items.has-more-items").remove()

    for(i=0;i<flagged_posts.length;i++){
      console.log(flagged_posts[i])
      reCreateElement.appendChild(flagged_posts[i])
    }

    // if(flagged_posts.length){
    //   flagged_posts.forEach(function(item){
    //     reCreateElement.appendChild(item)
    //   })
    // }
  }
});
