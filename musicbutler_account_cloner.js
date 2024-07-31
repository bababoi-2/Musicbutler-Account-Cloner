// ==UserScript==
// @name         Music Butler Account Cloner
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Copies the data of the logged in account to a new account. Can be used to renew your premium trial.
// @author       Bababoiiiii
// @match        https://www.musicbutler.io/
// @match        https://www.musicbutler.io/accounts/register?create
// @icon         https://www.google.com/s2/favicons?sz=64&domain=musicbutler.io
// @grant        none
// ==/UserScript==


class Settings {
    constructor(old_settings, new_settings, csrf) {
        this.old_settings = old_settings;
        this.new_settings = new_settings;
        this.csrf = csrf;
        this.headers = {
            "x-csrftoken": csrf,
            "Content-Type": "application/x-www-form-urlencoded"
        }
    }

    static async get_user_settings(only_csrf) {
        const r = await fetch("https://www.musicbutler.io/users/profile/");
        const resp = await r.text();
        const page = (new DOMParser).parseFromString(resp, "text/html");

        const csrf = page.querySelector("input[name='csrfmiddlewaretoken']").value;
        if (only_csrf) {
            return csrf;
        }

        const settings = {
            release_types: {
                album: page.querySelector("#id_notify_album").checked,
                ep: page.querySelector("#id_notify_ep").checked,
                single: page.querySelector("#id_notify_single").checked,
                compilation: page.querySelector("#id_notify_compilation").checked,
                live: page.querySelector("#id_notify_live").checked,
                remix: page.querySelector("#id_notify_remix").checked,
                other: page.querySelector("#id_notify_other").checked,
            },
            features: page.querySelector("#id_wants_nonprimary_releases").checked,
            listening_links: {
                tidal_instead_of_ytmusic: page.querySelector("#tidal-over-youtube-music-form-containing-div").querySelector("#id_is_on").checked,
                yt_instead_of_amazon: page.querySelector("#youtube-over-amazon-music-form-containing-div").querySelector("#id_is_on").checked,
                deezer_instead_of_applemusic: page.querySelector("#deezer-over-apple-music-form-containing-div").querySelector("#id_is_on").checked,
                bandcamp_istead_of_spotify: page.querySelector("#bandcamp-over-spotify-form-containing-div").querySelector("#id_is_on").checked,
            },
            amazon_store_location: page.querySelector("#id_amazon_locale").value,
            explicit_or_clean: page.querySelector("#id_content_rating_preference").value,
            email_preferences: {
                music_drops: page.querySelector("#id_notify").checked,
                product_updates: page.querySelector("#id_wants_product_emails").checked,
            },
            integrations: {
                open_spotify_in_app: page.querySelector("#id_convert_spotify_links").checked
            },
            date_format: page.querySelector("#id_date_format").value
        }


        return [csrf, settings];
    }

    release_types() {
        let body = `csrfmiddlewaretoken=${this.csrf}`;
        let is_different = false;
        for (let option of Object.entries(this.old_settings.release_types)) {
            if (option[1] !== this.new_settings.release_types[option[0]]) {
                is_different = true;
            }
            if (option[1] === true) {
                body+=`&notify_${option[0]}=on`
            };
        }

        const promises = []
        if (is_different) {
            promises.push(fetch("https://www.musicbutler.io/users/update-profile-music-preferences-types", {
                "headers": this.headers,
                "body": body,
                "method": "POST",
            }));
        }

        if (this.old_settings.features !== this.new_settings.features) {
            promises.push(fetch("https://www.musicbutler.io/users/update-profile-music-preferences-features", {
                "headers": this.headers,
                "body": `csrfmiddlewaretoken=${this.csrf}${this.old_settings.features ? "&wants_nonprimary_releases=on" : ""}`,
                "method": "POST",
            }));
        }
        return promises;
    }

    listening_links() {
        const body_parts = ["service_to_remove=YouTube%20Music&service_to_add=Tidal", "service_to_remove=Amazon&service_to_add=YouTube", "service_to_remove=Apple%20Music&service_to_add=Deezer", "service_to_remove=Spotify&service_to_add=Bandcamp"]
        const old_values = Object.values(this.old_settings.listening_links); // same order as body_parts
        const new_values = Object.values(this.new_settings.listening_links);

        const promises = [];
        for (let i = 0; i < body_parts.length; i++) {
            if (old_values[i] !== new_values[i]) {
                promises.push(fetch("https://www.musicbutler.io/users/preferences-listening-links-change", {
                    "headers": this.headers,
                    "body": `csrfmiddlewaretoken=${this.csrf}&${body_parts[i]}${old_values[i] ? "&is_on=on" : ""}`,
                    "method": "POST",
                }));
            }
        }

        return promises;
    }

    amazon_store_location() {
        if (this.old_settings.amazon_store_location !== this.new_settings.amazon_store_location) {
            return fetch("https://www.musicbutler.io/users/update-profile-amazon-store", {
                "headers": this.headers,
                "body": `csrfmiddlewaretoken=${this.csrf}&amazon_locale=${this.old_settings.amazon_store_location}`,
                "method": "POST",
            });
        }
    }

    explicit_or_clean() {
        if (this.old_settings.explicit_or_clean !== this.new_settings.explicit_or_clean) {
            return fetch("https://www.musicbutler.io/users/update-profile-music-preferences-content-rating", {
                "headers": this.headers,
                "body": `csrfmiddlewaretoken=${this.csrf}&content_rating_preference=${this.old_settings.explicit_or_clean}`,
                "method": "POST",
            });
        }
    }

    email_preferences() {
        let body = `csrfmiddlewaretoken=${this.csrf}`;
        let is_different = false;
        if (this.old_settings.email_preferences.music_drops) {
            if (this.old_settings.email_preferences.music_drops !== this.new_settings.email_preferences.music_drops) {
                is_different = true;
            }
            body += "&notify=on";
        }
        if (this.old_settings.email_preferences.product_updates) {
            if (this.old_settings.email_preferences.product_updates !== this.new_settings.email_preferences.product_updates) {
                is_different = true;
            }
            body += "&wants_product_emails=on"
        };

        if (is_different) {
            return fetch("https://www.musicbutler.io/users/update-profile-email-preferences", {
                "headers": this.headers,
                "body": body,
                "method": "POST",
            });
        }
    }

    integrations() {
        if (this.old_settings.integrations.open_spotify_in_app !== this.new_settings.integrations.open_spotify_in_app) {
            return fetch("https://www.musicbutler.io/users/update-profile-preferences-integrations-convert-spotify_links", {
                "headers": this.headers,
                "body": `csrfmiddlewaretoken=${this.csrf}&${this.old_settings.integrations.open_spotify_in_app ? "convert_spotify_links=on" : ""}`,
                "method": "POST",
            });
        }
    }

    date_format() {
        if (this.old_settings.date_format !== this.new_settings.date_format) {
            return fetch("https://www.musicbutler.io/users/update-profile-personalization-preferences", {
                "headers": this.headers,
                "body": `csrfmiddlewaretoken=${this.csrf}&date_format=${this.old_settings.date_format}`,
                "method": "POST",
            });
        }
    }

    async set_all() {
        // if we await all at once, the settings dont apply correctly
        output("Changing Release Types");
        for (let promise of this.release_types()) await promise;
        output("Changing Listening Links");
        for (let promise of this.listening_links()) await promise;
        output("Changing Amazon Store Location");
        await this.amazon_store_location();
        output("Changing Content Rating");
        await this.explicit_or_clean();
        output("Changing Email Preferences");
        await this.email_preferences();
        output("Changing Integrations");
        await this.integrations();
        output("Changing Date Format");
        await this.date_format();
    }
}

async function get_artists() {
    const r = await fetch("https://www.musicbutler.io/artists/?sort=latestFollow&search=&org.htmx.cache-buster=artists-grid&sort=latestFollow");
    const resp = await r.text();
    const page = (new DOMParser).parseFromString(resp, "text/html");

    const ids = Array.from(page.querySelectorAll("#artists-grid > div"), e => e.querySelector("div").getAttribute("data-artist-id"));
    return ids;
}

async function set_artists(ids, csrf) {
    const promises = [];
    for (let id of ids) {
        promises.push(fetch("https://www.musicbutler.io/api-add-artist/", {
            "headers": {
                "content-type": "application/x-www-form-urlencoded",
                "x-csrftoken": csrf
            },
            "body": `applemusic_id=${id}`,
            "method": "POST",
        }));
    }

    for (let i = 0; i < promises.length; i += 5) {
        const chunk = promises.slice(i, i + 5);
        await Promise.all(chunk);
    }
}

async function get_current_username() {
    const r = await fetch("https://www.musicbutler.io/members/subscription-thank-you"); // idk of a better way lol
    const resp = await r.text();
    const page = (new DOMParser).parseFromString(resp, "text/html");

    const l = page.querySelector("#content > div > div > div > p.mt-4").textContent.split(" ");
    const username = l[l.length-1].slice(0, -1);
    return username;
}

async function get_current_email() {
    const r = await fetch("https://www.musicbutler.io/users/change_email/"); // idk of a better way lol
    const resp = await r.text();
    const page = (new DOMParser).parseFromString(resp, "text/html");

    return page.querySelector("#id_email_field").value;
}

async function signup(email, username, password, captcha, csrf) { //since we can only get the captcha by being on the page we also have the csrf
    const r = await fetch("https://www.musicbutler.io/accounts/register?create", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded",
        },
        "body": `csrfmiddlewaretoken=${csrf}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&password1=${encodeURIComponent(password)}&password2=${encodeURIComponent(password)}&recaptcha=${encodeURIComponent(captcha)}`,
        "method": "POST",
        "mode": "cors",
        "credentials": "include"
    });
    return r;
}

async function login(username, password) {
    let r = await fetch("https://www.musicbutler.io/accounts/login");
    let resp = await r.text();
    const page = (new DOMParser).parseFromString(resp, "text/html");

    const csrf = page.querySelector("input[name='csrfmiddlewaretoken']").value;
    // sets the cookie so we are really logged into the other account
    r = await fetch("https://www.musicbutler.io/accounts/login", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded",
        },
        "body": `csrfmiddlewaretoken=${csrf}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&next=`,
        "method": "POST",
        "credentials": "include"
    });

    return r;
}

async function delete_current_account() {
    let r = await fetch("https://www.musicbutler.io/users/delete_account/");
    const resp = await r.text();
    const page = (new DOMParser).parseFromString(resp, "text/html");

    const csrf = page.querySelector("input[name='csrfmiddlewaretoken']").value;
    r = await fetch("https://www.musicbutler.io/users/delete_account/", {
        "headers": {
            "content-type": "application/x-www-form-urlencoded",
        },
        "body": `csrfmiddlewaretoken=${csrf}&verification_field=YES&change_email=`,
        "method": "POST",
        "credentials": "include"
    });
    return r;
}


function validate_email(email) {
    return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
}

function output(text) {
    document.title = text;
}

function encode(s) {
    const offset = 14+Math.floor(Math.random()*50);
    // \n (10) and \r (13) cause issues so +14
    return String.fromCharCode(offset) + btoa(
        Array.from(
            btoa(s).split(""),
            c => String.fromCharCode( c.charCodeAt()+offset ) + String.fromCharCode( 14+Math.floor(Math.random()*200) )
        ).join(""))
}

function decode(s) {
    const offset = s.charCodeAt(0);
    return atob(
        atob(
            s.slice(1)
        ).replace(/(.)./g, (a, _) => String.fromCharCode(a.charCodeAt() - offset))
    );
}

(function() {
    'use strict';

    if (location.href === "https://www.musicbutler.io/") {
        main_page();
    } else if (location.href === "https://www.musicbutler.io/accounts/register?create") {
        register_page();
    }

    function main_page() {
        let parent = document.querySelector("#feed-stats > div.flex.flex-col.items-center")
        if (!parent) {
            return;
        }
        // if you only want this option to appear if you have no premium
        // let premium_ran_out_btn = parent?.querySelector("div > a");
        // if (!premium_ran_out_btn) {
        //     return;
        // }

        let username_inpt = document.createElement("input");
        username_inpt.placeholder = "Target Username";
        username_inpt.title = "Enter the current username or leave empty in order to renew the premium subscription (re-creates the account)"
        username_inpt.className = "bg-skin-clickable-card text-sm ring-1 ring-inset rounded-lg hover:bg-skin-clickable-card-hover focus:bg-skin--card-hover";
        username_inpt.style.padding = "1px 5px";
        username_inpt.style.margin = "2px";

        let password_inpt = document.createElement("input");
        password_inpt.placeholder = "Target Account Password";
        password_inpt.title = "If you want to renew the subscription, enter the password of the current account"
        password_inpt.className = "bg-skin-clickable-card text-sm ring-1 ring-inset rounded-lg hover:bg-skin-clickable-card-hover focus:bg-skin--card-hover";
        password_inpt.style.padding = "1px 5px";
        password_inpt.style.margin = "2px";
        password_inpt.type = "password";

        let clone_btn = document.createElement("button");
        clone_btn.className = "cursor-pointer outline-none font-semibold rounded-lg p-1 px-2 hover:ring-1 bg-skin-base-200 text-skin-base-200-content hover:ring-skin-secondary focus:ring-2 focus:ring-skin-secondary";
        clone_btn.style.margin = "2px";
        clone_btn.textContent = "Clone Account to new Account";

        clone_btn.onclick = async () => {
            output("Getting settings");
            let [_, old_settings] = await Settings.get_user_settings();
            let artists = await get_artists();
            const orig_username = await get_current_username();
            const orig_email = await get_current_email();
            let new_username = username_inpt.value;
            const new_password = password_inpt.value;

            if (new_password === "") {
                alert("Password needed");
                return;
            }
            if (new_username === "") {
                new_username = orig_username;
            }
            if (new_username === orig_username) {
                if (!confirm("You are trying to renew the current account. This will delete the current account and create a new account with the same data (also same username and password). Continue?")) {
                    return;
                }
                const data = {
                    o_s: encode(JSON.stringify(old_settings)),
                    o_a: encode(JSON.stringify(artists)),
                    c: {
                        // just to make the credentials a bit less not obvious as they are
                        u: encode(orig_username),
                        e: encode(orig_email),
                        p: encode(new_password)
                    }
                }
                localStorage.setItem("o_a_d", JSON.stringify(data));
                await delete_current_account();
                location.href = "https://www.musicbutler.io/accounts/register?create"

            } else {
                output("Logging into new account");
                await login(username_inpt.value, password_inpt.value);
                let [csrf, new_settings] = await Settings.get_user_settings();
                let cloner = new Settings(old_settings, new_settings, csrf);
                output("Applying settings to new account");
                await cloner.set_all()
                output("Cloning Artists");
                await set_artists(artists, csrf);
                output("Done, refresh page to see results");
            }
        }

        parent.append(username_inpt, password_inpt, clone_btn);
    }

    function register_page() {
        if (!( (new URLSearchParams(location.search)).has("create") )) {
            return;
        }

        let data = localStorage.getItem("o_a_d");
        if (!data) {
            alert("Something went wrong when saving the settings earlier");
            return;
        }

        data = JSON.parse(data);
        const orig_email = decode(data.c.e);
        const orig_username = decode(data.c.u);
        const orig_password = decode(data.c.p);
        const orig_settings = JSON.parse(decode(data.o_s));
        const orig_artists = JSON.parse(decode(data.o_a));


        output("Wait, do not do anything");

        const wait_for_captcha = setInterval(async () => {
            let captcha_response = document.querySelector("#id_recaptcha").value;
            if (captcha_response !== "") {
                clearInterval(wait_for_captcha);

                await signup(orig_email, orig_username, orig_password, captcha_response, document.querySelector("input[name='csrfmiddlewaretoken']").value);
                output("Enter Activation Link");
                let activation_link = prompt("Activation Link (e.g. https://www.musicbutler.io/accounts/activate/somerandomletters/)");
                const r = await fetch(activation_link);
                if (!r.ok) {
                    alert("Activation Link is probably faulty");
                }

                output("Logging into new account");
                await login(orig_username, orig_password);
                let [csrf, new_settings] = await Settings.get_user_settings();
                output("Applying settings to new account");
                let cloner = new Settings(orig_settings, new_settings, csrf);
                await cloner.set_all()
                output("Cloning Artists");
                await set_artists(orig_artists, csrf);
                location.href = "https://www.musicbutler.io/";
                output("Done, refreshing page");
            }
        }, 100);
    }
})();
