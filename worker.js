import amqp from 'amqplib/callback_api.js';
import dotenv from "dotenv"
import connectDB from "./config/db.js"
import { ChatGPTAPI } from 'chatgpt'
import User from "./models/userModel.js"
import Quote from "./models/quoteModel.js"

import Activity from "./models/activityModel.js"
import Rule from "./models/ruleModel.js"
import AdminRule from "./models/adminRuleModel.js"

import { CoreConfig, Utils as QBUtils, TreeStore } from './node_modules/@react-awesome-query-builder/core/cjs/index.js';
import jsonLogic from 'json-logic-js'
import axios from 'axios';


dotenv.config()
connectDB()

const config = {
  ...CoreConfig,
  fields: {
    distance: {
      label: "Distance",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    moving_time: {
      label: "Moving Time",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    elapsed_time: {
      label: "Elapsed Time",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    total_elevation_gain: {
      label: "Total Elevation Gain",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    average_cadence: {
      label: "Average Cadence",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    average_watts: {
      label: "Average Watts",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    weighted_average_watts: {
      label: "Weighted Average Watts",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    max_watts: {
      label: "Max Watts",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    elev_high: {
      label: "Highest Elevation",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    elev_low: {
      label: "Lowest Elevation",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    description: {
      label: "Description",
      type: "text",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    calories: {
      label: "Total calories",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    average_speed: {
      label: "Average Speed",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    device_name: {
      label: "Device Name",
      type: "text",
      valueSources: ["value"],
    },
    gear_id: {
      label: "Gear ID",
      type: "number",
      fieldSettings: {
        min: 0
      },
      valueSources: ["value"],
      preferWidgets: ["number"]
    },
    name: {
      label: 'Name',
      type: 'text',
    },
    type: {
      label: 'Type',
      type: 'text',
    }
  }
};


const getKeywords = async (newActivity) => {


  const adminrules = await AdminRule.find({})
  const keywords = []
  for (const adminrule of adminrules) {
    console.log("Processing Admin Rule " + adminrule.name)
    const initialTree = QBUtils.loadTree(JSON.parse(adminrule.rule));
    const reducer = TreeStore(config);
    let state = reducer({ tree: initialTree });
    const tree = QBUtils.getTree(state.tree);
    const { logic } = QBUtils.jsonLogicFormat(state.tree, config);
    console.log(JSON.stringify(logic))
    console.log("RESULT is " + jsonLogic.apply(logic, newActivity))
    if (jsonLogic.apply(logic, newActivity)) {
      console.log("Activity Rule Matched " + adminrule.setParam + " --- " + adminrule.setValue)
      if (adminrule.setParam == 'setActivityProperty') {
        keywords.push(adminrule.setValue)
      }

    }

  }
  return keywords
}

amqp.connect(process.env.CONN_URL, function (err, conn) {
  conn.createChannel(function (err, ch) {
    ch.consume('activities', async function (msg) {
      console.log('.....');
      console.log("Message:", msg.content.toString());
      const u = JSON.parse(msg.content)
      if (u.aspect_type == 'create' && u.object_type == 'activity') {

        // Check if the activity is already present
        console.log("U is " + u.object_id)
        const existingactivity = await Activity.findOne({ act_id: u.object_id })
        console.log("Existing activity " + existingactivity)
        if (existingactivity != undefined) {
          console.log("Existing activity " + existingactivity.act_id)
        } else {
          const user = await User.findOne({ strava_athlete_id: u.owner_id })
          console.log(user.strava_athlete_id)
          axios.post("https://www.strava.com/api/v3/oauth/token", {
            client_id: '120373',
            client_secret: '3319dd8ae0862abf96bb07f0c1472bb1fe6a8299',
            grant_type: "refresh_token",
            refresh_token: user.strava_rt

          })
            .then(async (res1) => {
              console.log("Access Token is " + res1.data.access_token)
              user.starva_rt = res1.data.refresh_token
              user.starva_at = res1.data.access_token
              user.strava_token_expires = res1.data.expires_at
              user.save
              axios.get(`https://www.strava.com/api/v3/activities/${u.object_id}`, {
                headers: {
                  'Authorization': 'Bearer ' + res1.data.access_token
                }
              }).then(async (res2) => {
                const newActivity = {
                  user: user._id,
                  act_id: res2.data.id,
                  name: res2.data.name,
                  distance: res2.data.distance,
                  moving_time: res2.data.moving_time,
                  elapsed_time: res2.data.elapsed_time,
                  total_elevation_gain: res2.data.total_elevation_gain,
                  type: res2.data.type,
                  sport_type: res2.data.sport_type,
                  start_date: res2.data.start_date,
                  start_date_local: res2.data.start_date_local,
                  timezone: res2.data.timezone,
                  start_latlng: res2.data.start_latlng,
                  end_latlng: res2.data.end_latlng,
                  trainer: res2.data.trainer,
                  commute: res2.data.commute,
                  manual: res2.data.manual,
                  private: res2.data.private,
                  flagged: res2.data.flagged,
                  gear_id: res2.data.gear_id,
                  average_speed: res2.data.average_speed,
                  max_speed: res2.data.max_speed,
                  average_cadence: res2.data.average_cadence,
                  average_temp: res2.data.average_temp,
                  average_watts: res2.data.average_watts,
                  weighted_average_watts: res2.data.weighted_average_watts,
                  kilojoules: res2.data.kilojoules,
                  max_watts: res2.data.max_watts,
                  elev_high: res2.data.elev_high,
                  elev_low: res2.data.elev_low,
                  workout_type: res2.data.workout_type,
                  description: res2.data.description,
                  calories: res2.data.calories,
                  device_name: res2.data.device_name,
                  gear: res2.data.gear,
                  map: JSON.stringify(res2.data.map)
                }
                console.log("Activity is " + JSON.stringify(newActivity))
                const kw = await getKeywords(newActivity)
                console.log("keywords are  " + JSON.stringify(kw))
                const headers = {
                  'Authorization': 'Bearer ' + res1.data.access_token,
                  'Content-Type': 'application/json'
                }

                // Get the value to set
                const Payload = {}


                /// ChatGPT logic
                /*
                const api = new ChatGPTAPI({
                  apiKey: process.env.CHATGPT_KEY
                })
                try {
                  var question = ''
                  if (res2.data.type == 'Ride') {
                    console.log("Activity is Ride")
                    if (kw.length) {
                      question = `Give me a motivational quote for a cycle ride of ${kw.join(' and ')} with maximum 30 words`
                    } else {
                      question = `Give me a motivational quote for a cycle ride with maximum 30 words `
                    }
                  } else if (res2.data.type == 'Run') {
                    console.log("Activity is Run")
                    if (kw.length) {
                      question = `Give me a motivational quote for a run of ${kw.join(' and ')} with maximum 30 words `
                    } else {
                      question = `Give me a motivational quote for a run with maximum 30 words `
                    }
                  } else {
                    console.log("Activity is " + res2.data.type)
                    question = `Give me a motivational quote for ${res2.data.type}  with maximum 30 words `
                  }

                  //const res = await api.sendMessage(`Give me a title for a cycle ride of ${(res2.data.distance / 1000).toFixed(2)} kms with out any numbers `)
                  const res = await api.sendMessage(question)
                  console.log("Chat GPT response is " + res.text)
                  Payload['name'] = res.text.replace(/(^"|"$)/g, '')
                  Payload['description'] = "Activity Named by https://BSRsport.org"
                } catch (error) {
                  console.log("CHATGPT error is " + JSON.stringify(error))
                  let config = {
                    method: 'get',
                    maxBodyLength: Infinity,
                    url: 'https://api.quotable.io/random?size=10&tags=motivational|inspirational|sports',
                    headers: {}
                  };

                  const quote = await axios.request(config)
                    .then((response) => {
                      Payload['name'] = response.data.content
                      Payload['description'] = "Activity Named by https://BSRsport.org"
                      console.log(JSON.stringify(response.data));
                    })
                    .catch((error) => {
                      console.log(error);
                    });
                }
                */

                // Get the random quote from DB 

                res2.data.type

                const count = await Quote.countDocuments()
                console.log(`Count is ${count}`)
                // Get a   random entry
                var random = Math.floor(Math.random() * count)
                console.log(`Random is ${random}`)
                // Again query all users but only fetch one offset by our random #
                const quote = await Quote.findOne().skip(random)
                console.log(`Quote is ${quote.quote}`)
                Payload['name'] = quote.quote
                Payload['description'] = "Activity Named by https://BSRsport.org"


                axios.put(`https://www.strava.com/api/v3/activities/${u.object_id}`, Payload, { headers })
                  .then(response => {
                    //ch.ack(msg)
                    console.log("SUCCESSFULLY UPDATED ACTIVITY !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
                  })
                  .catch(error => {
                    console.log(error)
                  });

                const savedactivity = await Activity.create(newActivity)
                if (savedactivity) {
                  user.activities.push(savedactivity._id)
                  user.save().then((res) => {
                    console.log("Actvity Saved")
                  })
                } else {
                  console.log("Error attaching activity to user " + err)
                }
              })
                .catch((error) => {
                  console.log(error)
                });
              //ch.ack(msg)
            })
        }
      }
      // Logic for Updates
      if (u.aspect_type == 'update' && u.object_type == 'activity') {
        const existingactivity = await Activity.findOne({ act_id: u.object_id })

        if (existingactivity) {
          console.log("Update existing activity " + u.object_id)
          // find the updates
          const payload = {}
          if (u.updates['title']) {
            payload.name = u.updates['title']
          }
          if (u.updates['type']) {
            payload.type = u.updates['type']
          }
          const updateActivity = await Activity.updateOne({ act_id: u.object_id }, payload)
        }
      }

      // Logic for Deletes
      if (u.aspect_type == 'delete' && u.object_type == 'activity') {
        const existingactivity = await Activity.findOne({ act_id: u.object_id })

        if (existingactivity) {
          console.log("Delete existing activity " + u.object_id)
          const deleteActivity = await Activity.deleteOne({ act_id: u.object_id })
        }
      }
      ch.ack(msg)
    })
  })
}, { noAck: false }
);


