# Authentication ideas

Check cookie. If nothing, redirect to auth flow. If something, validate it's real.

## Auth flow

We'll always do something like redirect to a login page that redirects back with a token in the query parameter. After that we want to save it somewhere.

Maybe, when we start this, we create a key pair, set the public key as the cookie, and save the private key to a file named after the session id...or something like that.

I'm wondering if there's a way to create a file on s3 or something with content I can validate based on the value of the cookie. For instance, let's say it's just math. At the beginning, I generate the formula 1 + 2 = 3. I give the cookie the value 1. To validate, I look up that session (1) and get 2,3. Then I could ask the client for the other number?

## Validation