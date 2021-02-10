# aws-oauth-helper
An AWS Lambda function to handle the oauth client secret part of oauth so that your webpage can allow users to login to oauth services.

If you look through [the OAuth flow](https://docs.github.com/en/free-pro-team@latest/developers/apps/authorizing-oauth-apps#web-application-flow), at least for Github and I guess I'm assuming the rest are the same
then you'll see it works like this

1. User clicks some login button on your webpage

2. Your webpage opens a popup or iframe to [the oauth login page for the service](https://github.com/login/oauth/authorize) you want them to login

   In the URL you include 3 search parameters
   
   1. the `client_id` assigned to your app when you [registered it](https://github.com/settings/developers) with the service. 
   2. the `scope` which is [the features of their account you want to access with your app](https://docs.github.com/en/free-pro-team@latest/developers/apps/scopes-for-oauth-apps)
   3. a `state` string which is some extra data you make up and use later to make sure the request is legit
   
3. The user logs in via the popup/iframe and then is presented with some page that says something like

   > app "XYZ" wants to permission to do A, B, and C (read your email address, look at your friend list, etc..)
   
   If the user clicks ok then 
   
4. The service (in this case github) redirects the browser to [a URL you pre-registred when you 
   added the app](https://github.com/settings/developers) and includes a `code`, which at least with github, is valid for 10 minutes. It also includes the `state`
   you sent previously so you can check it's the same as when you sent it. This allows you to prevent someone from going directly the
   the page you registered as the URL for github to send you the code.

5. Your page that github redirected the user's browser to then needs contact github at [a different URL](https://github.com/login/oauth/access_token) and pass it the `code`, your app's `client_id` and a `client_secret` (also from when you [registered the app](https://github.com/settings/developers). This is where this repo comes it.
   
   The fact that it's a "client_**secret**" means this secret can't be stored in your webpage. It has to be on a server somewhere. That's where this repo's function comes in. You setup this funciton on AWS Lambda, you connect it to AWS API Gateway. Your webpage then contacts this function via some URL at Amazon, sending it the `code`, and `client_id`. The function then contacts github adding in the `client_secret`. In return you get back an `access_token` which is effectively a password for the user's github account that lets your app do the things you requested permission to do above. Where you store that is up to you but it is a password with no username required and anyone that has it can do anything you asked permission for.
   
# How to use

1. Create an AWS account
2. Find AWS Lambda
3. Create a Function
4. In the code area for index.js paste the contents of [aws-oauth-helper.js](https://github.com/greggman/aws-oauth-helper/blob/main/aws-oauth-helper.js). Then click "Deploy"
5. Scroll down and where it says environment variables add a key in the form `c_<client_id>` where `client_id` is given to you by github when you [registered your app](https://github.com/settings/developers). Note the `c_` before the rest of the id. This is because ids can start with a number so we add the prefix `c_`. For the value, paste in the secret key, also given to you when you registered your app. Also add another variable, key `e_<client_id>` and set the value to the endpoint for getting the access token from the service. In the case of github it's `https://github.com/login/oauth/access_token`. In other words

   ```
   key               value
   ---------------+------------------
   c_<client_id>  |  <client_secret>
   e_<client_id>  |  <endpoint>
   ```
   
   Mine look something like this
   
   ```
   c_34093c3c2eeb4dc7fd0f  3eb4d4093c3c2ec7fd0f3c2eeb4dc7fd0f34093c
   e_34093c3c2eeb4dc7fd0f  https://github.com/login/oauth/access_token
   ```


6. Back at the top you'll see a "Designer" diagram. Click the "Add Triggers" button
7. Select the API Gateway as a trigger
8. Create an API, REST API, Security: Open and click Add
9. Now below the diagram you should see API gateway and a link to the API you just created. Click that link
10. In the left panel select "Resources"
11. At the top of the middle column click the "Actions" button and pick "Deploy API". When asked for a stage pick "default"
12. Now click stages on the left
13. In the middle column, click the little triangle/arrow next to default to open it up, then again open the `/` under that, and the next thing under that, then click on "GET".
14. On the right panel you'll see a URL. This is the URL needed at step 5 above. Your webpage would do something like

    ```
    // some async function
    const url = `${urlFromAWSPanel}?code=${codeFromGithubStep4Above}&clientId=${clientIdFromGithub}`;
    const req = await fetch(url);
    const data = await req.json();
    if (data.access_token) {
       // success. Use this as the auth parameter to something iike Octokit:rest https://octokit.github.io/rest.js/v18
    } else {
       // failure. 
    }
    ```
    
Note that most likely it would be good for you to register a domain name and then in the AWS API Gateway register some subdomain as a custom domain name for your API. That way instead of have to fetch to something like `https://30923eifjifj.execute-api.us-east2.amazonaws.com/default` you could use `https://myapi.mycustomdomain.com/api-name`
    
# License: MIT

# Thanks:

Thanks to https://github.com/HenrikJoreteg/github-secret-keeper which made it clear how simple this could be.
