# cfguard

The goal of this project is to have a simple way to deploy a static site, but with authentication, that's easy to access on a Kobo. This last bit is why I needed to make my own flow with a QR code I can open on my phone.

The most straightforward way to do this was to make an OpenID Connect worker and set that as a custom auth method in cloudflare "access", and then require auth by my custom OpenID Connect worker for my other workers.

So, to set up:

- clone this repo
- `npm install`
- `npm run deploy`

That should create a "login" worker in your cloudflare account. Next, you need to add it to your Zero Trust config:

- <https://one.dash.cloudflare.com>
- select account
- click "Settings"
- click "Authentication"
- click "Add new" in "Login methods"
- select "OpenID Connect"

Now you have a bunch of inputs to fill out. To do so, you need to make a client.

- go to the home page of the worker
- create a client
- create a user
- fill out the fields with the client info
- save the login method
- click "Test" and login as your user

Now you can add this to an application:

- go to "Applications"
- select or create an application
- go to the "Login methods" tab
- select your new OpenID Connect login method
- (optional) disable everything else and check "instant auth"
- go to the "Policies" tab
- select or create a policy with the following properties:
  - Action: Allow
  - Rules -> Include -> Selector: Login Methods, Value: OpenID Connect - (your thing)

And now if you go to your application you should see a login page that will accept your user.
