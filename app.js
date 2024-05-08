const express = require("express")
const https = require("https")
const fs = require("fs")
const session = require("express-session")
const cors = require("cors")
const app = express()
const MemoryStore = require('memorystore')(session)
const axios = require("axios")
const cheerio = require('cheerio');
const qs = require('qs');
const bodyParser = require('body-parser') 





// Local host stuff
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


// const options = {
    
//     key: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\key.pem'),
//     cert: fs.readFileSync('C:\\Program Files\\Git\\usr\\bin\\certificate.pem')
// }



// Production stuff

const options = {
    cert: fs.readFileSync("/etc/letsencrypt/live/api.gradevue.com/cert.pem"),    
    key : fs.readFileSync("/etc/letsencrypt/live/api.gradevue.com/privkey.pem"),
}


const server = https.createServer(options,app)
app.set('trust proxy', 1) // trust first proxy


// For localhost
// app.use(cors({
//      credentials: true, 
//      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
//      origin: true
// }));



// For production
app.use(cors({
    credentials: true, 
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    origin: "https://gradevue.com"
}));



app.use(bodyParser.json())
app.use(session({
    secret: "secret cat",
    cookie: {
        path: "/",
        maxAge: 2628000000,
        httpOnly: true , // This is because i want to track if the cookie changes so i can change accordingly.
        sameSite: "none",
        secure: true
        // secure: true, // Set the Secure attribute
    },
    resave: false,
    saveUninitialized: true,
    store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
    }),
}));


function getClientId(endpoint) {
    return new Promise(async (resolve, reject) => {



        axios.request({
            method: "GET",
            url: endpoint+"/PXP2_Login.aspx",

            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
            }




        })
        .then((response, err) => {
            if (response) {
                console.log(response)
                let cookies = response.headers["set-cookie"]
                
                let prevList = ''
                cookies.forEach((cookie,i) => {
                if (cookie.split(";").length != 0) {
                    let value = cookie.split(";")[0]
                    prevList = prevList + value +"; "
                } else {
                    console.log("ur fake")
                }

                
                
            })
    
    
            prevList = prevList.slice(0, -1)
            resolve(prevList)
            } else {
                if (err) {
                    resolve(err)
                }
                
            }

        })


















    })





}






async function startClient(cookies, url, password, username) {
    return new Promise(async (resolve,reject) => {

        
        

        

    
        let formBody = qs.stringify({
            '__VIEWSTATE': '8ysQ+/7X3U/k9Afjaim6mg7GTzpdygwd0Oj+yQxcZCEXHXhIVxoMHHSBzUKco2bAZ6qdaPbap0Cbc76cQnkXdc+dHBijo1nKwNJRMz45/sM=',
            '__VIEWSTATEGENERATOR': 'E13CECB1',
            '__EVENTVALIDATION': 'AZd2z6LADhkXxlHLC0pIJ4vpNWqNLn4wy+KGl2V3aUy+FeOAUn7Mebp5z0BUCbDsiNNN08Q9r5/EaYcaAT0vpwc9nQIzcksYYDkRwDh1QRPS6IQPmrVPRXca54n5gqUXoVfhmnEgL/cpTZpKAFJIiESSpL2XkKc73n171LI/Pn0=',
            'ctl00$MainContent$username': username,
            'ctl00$MainContent$password': password,
            'ctl00$MainContent$Submit1': 'Login' 
          });
        
        const endpoint = url +"/PXP2_Login_Student.aspx?"
    
    
    
        
        await axios.request({
            url: endpoint,
            method: "POST",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },

            data: formBody
        }).then((response, err) => {
            if (response) {
                console.log(response)    
                resolve([response,username])
            } else {
                resolve([err,username])
                console.log(err)
            }
        })
    })
   
    
}




// This map would have the cookie id first and then the 2nd one would be the other one. 
const users = new Map();
const userClasses = new Map();

function authenticateUser(req) {
    return new Promise((resolve) => {
        let sessionId = req.sessionID;

        if (!sessionId) {
            resolve("No user found");
        } else {
            req.sessionStore.get(sessionId, (err, session) => {
                if (err) {
                    console.log(err);
                    resolve("No user found");
                } else {
                    if (!session) {
                        resolve("No user found");
                    } else {
                        const currentUser = session.user;
                        if (!currentUser) {
                            resolve("No user found");
                        } else {
                            resolve(currentUser);
                        }
                    }
                }
            });
        }
    });
}

app.post("/login", (req,res) => {

    let endpoint;
    let password;
    let username;
    try {
        endpoint = req.body.endpoint
        password = req.body.password
        username = req.body.username
        if ((endpoint === undefined) || (password === undefined) || (username === undefined)) {
            res.status(400).send(JSON.stringify({
                code: "err", 
                message: "invalid"
            }))
            return
        }
    } catch(e) {
        console.log(e)
        res.status(400).send(JSON.stringify({
            code: "err", 
            message: "invalid"
        }))
        return
    }



    getClientId(endpoint).then((clientId) => {

        startClient(clientId, endpoint, password, username).then((response) => {
            


            const list = response[0].request.path.split("/").filter((word) => word=="PXP2_LaunchPad.aspx" )


         
    
            if (list.length === 1) {
                req.session.user = response[1]
                users.set(req.sessionID, clientId)
                console.log(users)
                res.status(201).send({ 
                    code: "ok",
                    message: "success"
                })
                console.log(response)
            } else {
                res.status(404).send({
                    code: "err",
                    message: "invalid credentials"
                })
            }
            // this would only occur if it went well 
            // might not be scalable between schools
    
    
    
    
            
        })

    })




})





app.post("/doeverything", (req,res) => {
    
    let endpoint;
    try {
        endpoint = req.body.endpoint
        if (endpoint === undefined) {
            res.status(400).send(JSON.stringify({
                code: "err", 
                message: "invalid"
            }))
            return
        }
    } catch(e) {
        console.log(e)
        res.status(400).send(JSON.stringify({
            code: "err", 
            message: "invalid"
        }))
        return
    }




    authenticateUser(req).then((user) => {
        if (user == "No user found") {
            console.log("no one was found lol")
            res.status(404).send(JSON.stringify({code: "err", message: "no user found"}))
        } else {
            console.log(user)

            getGrades(user, req, endpoint).then(async(response) => {


                const $ = cheerio.load(response.data)
                const allClasses = $(".gb-class-row")
                let idList = []
                let schoolHeaders
                for (let i=0; i<allClasses.length; i++) {
                    if ((idList.includes(allClasses[i].attribs['data-guid'])) == false) {
                        idList.push(allClasses[i].attribs['data-guid'])
                    } else {
                        // do nothing
                    }
                }
                const allButtons = $(".btn")
                for (let k=0; k<allButtons.length; k++) {
                    try {
                        
                        if ((JSON.parse(allButtons[k].attribs['data-focus'])) != (undefined)) {
                            let parsedData = JSON.parse(allButtons[k].attribs['data-focus']).FocusArgs
                            schoolHeaders = {
                                schoolId: parsedData["schoolID"],
                                studentGU: parsedData["studentGU"],
                                markPeriodGU: parsedData["markPeriodGU"],
                                gradePeriodGU: parsedData["gradePeriodGU"],
                                OrgYearGU: parsedData["OrgYearGU"]
                            }
                            

                            break;
                        
                        }
                    } catch(e) {
                        // nothing
                    }
                    
                }
                console.log(schoolHeaders)
                console.log(idList)
                userClasses.set(user, 
                    {
                        schoolHeaders: schoolHeaders,
                        classes: idList
                    })
                        if (user == "No user found") {
                            console.log("no one was found")
                            res.status(404).send(JSON.stringify({code: "err", message: "no user found"}))
                        } else {
                            const sessionCookies = users.get(req.session.id)
                
                            let gradeBands = []
                            let firstPeriodId = 0
                            let allAssignments = []
                            let allCategories = []
                            let allClassGrades = []
                            let firstName
                            let continueLoop = true;
                            let data = {}
                
                        for (let i=0; i<userClasses.get(user)['classes'].length; i++) {
                            await preWork(sessionCookies, user, i, endpoint).then(async () => {
                        

                        
                            await getNames(sessionCookies, user, endpoint).then(async (names) => {
                        if (!continueLoop) {
                            return; 
                        }
                        if (sessionCookies != (undefined || null)) {
                            await preWork(sessionCookies, user, i, endpoint).then(async () => {
                                await getWork(sessionCookies, user).then(async (response) => {
                                
                                if (gradeBands.length === 0) {
                                    response.data.analysisBands[0].details.map((band, i) => {
                                        gradeBands.push({
                                            highScore: band.highScore,
                                            lowScore: band.lowScore,
                                            mark: band.mark
                                        });
                                    });
                                }
                                console.log("try the thing")
                                    if (i === 0) {
                                        firstPeriodId = response.data.classId;
                                        firstName = response.data.students[0].name;
                                        response.data.measureTypes.map((type) => {
                                        if (type.weight > 0) {
                                            allCategories.push(
                                                {
                                                    assignmentType: type.name,
                                                    categoryWorth: type.weight
                                                }
                                            )
                                            
                                        }
                                        })

                                        
                                    }
                                    let classList = {}
                                    response.data.assignments.map((assignment) => {
                                        const key = assignment.gradeBookId
                                        
                                        classList[key] = {
                                            category: assignment.category,
                                            totalEarned: parseFloat(assignment.score),
                                            totalPoints: parseFloat(assignment.maxValue)
                                        }
                                    });
                                    allAssignments.push(classList)
                
                                    allClassGrades.push({courseName: names.data.d.Data.Classes[i].Name,
                                        grade: response.data.classGrades[0].totalWeightedPercentage,
                                        period: i+1,
                                        courseTeacher: names.data.d.Data.Classes[i].TeacherName})


                                await getAssignmentNames(sessionCookies, user, endpoint).then((names) => {
                                    const dataNames = names.data.responseData.data
                                    let allNames = []
                                    dataNames.map((week) => {
                                        week.items.map((name) => {
                                            console.log("heres the i value",i)
                                            console.log("the name is", allAssignments[i][name.itemID])
                                            console.log("heres the title of the assignment", name.title)
                                            allAssignments[i][name.itemID].name = name.title
                                            let month = name.monthName
                                            let day = name.monthDay
                                           
                                            let d = new Date()
                                            let year = d.getFullYear()

                                            let formattedDate = day+ "-" + month+"-"+ year

                                            allAssignments[i][name.itemID].date = Date.parse(formattedDate)

                                        })
                                        
                                    })
                                    // const reversedNames = allNames.toReversed()
                                    console.log(names)
                
                                })


                            })
                            });
                        } else {
                            console.log("session cookie expired");
                            res.status(200).send(JSON.stringify({
                                code: "err",
                                message: "no session found"
                            }));
                            continueLoop = false;
                        }
                    });
                })
                }
                
                res.status(200).send(JSON.stringify({
                    code: "ok",
                    message: {
                        
                        allAssignments: allAssignments,
                        gradeBands: gradeBands,
                        initialGrades: allClassGrades,
                        assignmentTypes: allCategories,
                        name: firstName
                    }
                }));
                }
            })


        }
    })
    


    
    
            





        })
        




app.get("/callApi", async (req,res) => {
    getClientId().then((clientId) => {

        startClient(clientId).then((response) => {
    
    
    
    
    
    
    
            req.session.user = response[1]
            users.set(req.sessionID, clientId)
    
            console.log(users)
    
    
            res.status(201).send({
                code: "ok",
                message: "success"
            })
            console.log(response)
        })

    })
    



})


async function getGrades(user, req, endpoint) {
    return new Promise((resolve) => {

    const x = endpoint+"/PXP2_GradeBook.aspx?AGU=0"

    const cookieValue = users.get(req.sessionID).substring(0, users.get(req.sessionID).length-1)
    
    const username = "146475"


    
    console.log(cookieValue)
      let config = {
        method: "GET",
        maxBodyLength: Infinity,
        url: x,
        
        headers: { 
          "Accept": 'application/json, text/plain, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36', 
          'Content-Type': 'application/x-www-form-urlencoded', 
          'Cookie': cookieValue
        },
        
        
      };


      
    //   console.log("the cookie content is :" + cookieValue)
    axios.request(config)
      .then((response,err) => {
        if (response) {
            console.log(JSON.stringify(response.data));
            resolve(response)
        } else {
            console.log(err)
            resolve(err)
        }
        
      })

    })
    
}

 

app.get("/gradeApi" , (req,res) => {
    
    authenticateUser(req).then((user) => {
        if (user == "No user found") {
            console.log("no one was found lol")
            res.status(404).send(JSON.stringify({code: "err", message: "no user found"}))
        } else {
            console.log(user)

            getGrades(user, req).then((response) => {


                const $ = cheerio.load(response.data)
                const allClasses = $(".gb-class-row")
                let idList = []
                let schoolHeaders
                for (let i=0; i<allClasses.length; i++) {
                    if ((idList.includes(allClasses[i].attribs['data-guid'])) == false) {
                        idList.push(allClasses[i].attribs['data-guid'])
                    } else {
                        // do nothing
                    }
                }
                const allButtons = $(".btn")
                for (let k=0; k<allButtons.length; k++) {
                    try {
                        
                        if ((JSON.parse(allButtons[k].attribs['data-focus'])) != (undefined)) {
                            let parsedData = JSON.parse(allButtons[k].attribs['data-focus']).FocusArgs
                            schoolHeaders = {
                                schoolId: parsedData["schoolID"],
                                studentGU: parsedData["studentGU"],
                                markPeriodGU: parsedData["markPeriodGU"],
                                gradePeriodGU: parsedData["gradePeriodGU"],
                                OrgYearGU: parsedData["OrgYearGU"]
                            }
                            

                            break;
                        
                        }
                    } catch(e) {
                        // nothing
                    }
                    
                }
                console.log(schoolHeaders)
                console.log(idList)
                userClasses.set(user, 
                    {
                        schoolHeaders: schoolHeaders,
                        classes: idList
                    })





                






                res.status(200).send(JSON.stringify({code: "ok", message: "grades acquired"}))
                console.log(response)

            })

        }
    })

    




    
})


// app.get("/getAssignments", (req,res) => {
//     authenticateUser(req).then(async (user) => {
//         if (user == "No user found") {
//             console.log("no one was found")
//             res.status(404).send(JSON.stringify({code: "err", message: "no user found"}))
//         } else {
//             const sessionCookies = users.get(req.session.id)

//             let gradeBands = []
//             let firstPeriodId = 0
//             let allAssignments = []
//             let allClassGrades = {}
//             let firstName
//             let allCategories
//             let continueLoop = true;
//             let data = {}

//         for (let i=0; i<userClasses.get(user)['classes'].length; i++) {

        

//     await preWork(sessionCookies, user, i).then(async () => {
//         if (!continueLoop) {
//             return; // Exit the loop if continueLoop is false
//         }
//         if (sessionCookies != (undefined || null)) {
//             await getWork(sessionCookies, user).then(async (response) => {
//                 if (gradeBands.length === 0) {
//                     response.data.analysisBands[0].details.map((band, i) => {
//                         gradeBands.push({
//                             highScore: band.highScore,
//                             lowScore: band.lowScore,
//                             mark: band.mark
//                         });
//                     });
//                 }

//                 if (firstPeriodId != response.data.classId) {
//                     if (i === 0) {
//                         firstPeriodId = response.data.classId;
//                         firstName = response.data.students[0].name;

//                         response.data.measureTypes.map((type) => {
//                             if (type.weight > 0) {

//                             }
//                         })
//                     }
//                     let classList = {}
//                     response.data.assignments.map((assignment) => {
//                         const key = assignment.gradeBookId
                        
//                         classList[key] = {
//                             category: assignment.category,
//                             totalEarned: assignment.score,
//                             totalPoints: assignment.maxValue
//                         }



                       
//                     });

//                     allAssignments.push(classList)

                    
//                     allClassGrades[response.data.className] = response.data.classGrades[0].totalWeightedPercentage;
                
//                 }

//                 const thing = response;
//                 console.log(response);

//                 await getAssignmentNames(sessionCookies, user).then((names) => {
//                     const dataNames = names.data.responseData.data
//                     let allNames = []
                    


//                     dataNames.map((week) => {
//                         week.items.map((name) => {
//                             allAssignments[i][name.itemID].name = name.title
//                         })
                        
//                     })
//                     // const reversedNames = allNames.toReversed()
                   





//                     console.log(names)

//                 })




//             });
//         } else {
//             console.log("session cookie expired");
//             res.status(200).send(JSON.stringify({
//                 code: "err",
//                 message: "no session found"
//             }));
//             continueLoop = false;
//         }
//     });
// }

// res.status(200).send(JSON.stringify({
//     code: "ok",
//     message: {
        
//         allAssignments: allAssignments,
//         gradeBands: gradeBands,
//         initialGrades: allClassGrades
//     }
// }));





            
            

//         }
//     })
// })

function getAssignmentNames(cookie, user, endpoint) {
    return new Promise((resolve, reject) => {
        let data = '{"FriendlyName":"pxp.course.content.items","Method":"LoadWithOptions","Parameters":"{\\"loadOptions\\":{\\"sort\\":[{\\"selector\\":\\"due_date\\",\\"desc\\":false}],\\"filter\\":[[\\"isDone\\",\\"=\\",false]],\\"group\\":[{\\"Selector\\":\\"Week\\",\\"desc\\":false}],\\"requireTotalCount\\":true,\\"userData\\":{}},\\"clientState\\":{}}"}';

        let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: endpoint+'/api/GB/ClientSideData/Transfer?action=pxp.course.content.items-LoadWithOptions',
      headers: { 
        'CURRENT_WEB_PORTAL': 'StudentVUE', 
        'Content-Type': 'application/json; charset=UTF-8', 
        'Cookie': cookie
      },
      data : data
    };
    
    axios.request(config)
    .then((response) => {

      resolve(response)
    })
    .catch((error) => {
        resolve(error)
        console.log(error);
    });
    })
   




}



function preWork(cookie, user, classIndex, endpoint) {
    return new Promise((resolve) => {

        const heresThing = classIndex

 
        // ok so remember that the amount of classes is something that we can know easily.
        const userHeaders = userClasses.get(user)
        console.log(userHeaders)
        const x = endpoint+"/service/PXP2Communication.asmx/LoadControl"
        let data = 
        {"request":
            {"control":"Gradebook_RichContentClassDetails",
            "parameters": 
                {
                    "schoolID": userHeaders.schoolHeaders['schoolId'],
                    "classID":userHeaders.classes[heresThing],
                    "gradePeriodGU": userHeaders.schoolHeaders['gradePeriodGU'],
                    "subjectID":-1,
                    "teacherID":-1,
                    "markPeriodGU": userHeaders.schoolHeaders['markPeriodGU'],
                    "assignmentID":-1,
                    "standardIdentifier":null,
                    "viewName":"courseContent",
                    "studentGU": userHeaders.schoolHeaders['studentGU'],
                    "AGU":"0",
                    "OrgYearGU": userHeaders.schoolHeaders['OrgYearGU']
        }}};

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: x,
  headers: { 
    'Content-Type': 'application/json; charset=UTF-8', 
    'Origin': 'https://md-mcps-psv.edupoint.com', 
    'Referer': 'https://md-mcps-psv.edupoint.com/PXP2_GradeBook.aspx?AGU=0', 
    'User-Agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', 
    'X-Requested-With': 'XMLHttpRequest', 
    'Cookie': cookie
  },
  data : data
};

axios.request(config)
.then((response) => {
  resolve(response)
})
.catch((error) => {
  console.log(error);
  resolve(error)
});



    })
}


function getWork(cookie) {
    return new Promise((resolve) => {


    const endpoint = "https://md-mcps-psv.edupoint.com/api/GB/ClientSideData/Transfer?action=genericdata.classdata-GetClassData"
    let data = '{"FriendlyName":"genericdata.classdata","Method":"GetClassData","Parameters":"{}"}';

    let config = {
        method: 'POST',
        maxBodyLength: Infinity,
        url: endpoint,
        headers: { 
            'CURRENT_WEB_PORTAL': 'StudentVUE', 
            'Content-Type': 'application/json; charset=UTF-8', 
            'Cookie': cookie,
            
        },
        data : data
};




axios.request(config)
.then((response) => {
  console.log(JSON.stringify(response.data));
  resolve(response)
})
.catch((error) => {
  console.log(error);
  resolve(error)
});























    })
}









app.get("/", (req,res) => {
    res.send("ajksdf")
})


app.get("/postman", (req,res) => {

    
      





})




server.listen(443, () => {
    console.log("listening on port 300")
})



function getNames(cookie, username, endpoint) {

    return new Promise((resolve, reject) => {

        const userHeaders = userClasses.get(username)
        


        let data = {"request":
        {
            "gradingPeriodGU":userHeaders.schoolHeaders['gradePeriodGU'],
            "AGU":"0",
            "orgYearGU":userHeaders.schoolHeaders['OrgYearGU'],
            "schoolID": userHeaders.schoolHeaders['schoolId'],
            "markPeriodGU": userHeaders.schoolHeaders['markPeriodGU']
        }}
        let url = endpoint + "/service/PXP2Communication.asmx/GradebookFocusClassInfo"
        let config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: url,
            headers: { 
                'Accept': 'application/json, text/javascript, */*; q=0.01', 
                'Accept-Language': 'en-US,en;q=0.9,es-US;q=0.8,es;q=0.7', 
                'Connection': 'keep-alive', 
                'Content-Type': 'application/json; charset=UTF-8', 
                'Cookie': cookie, 
            },
            data : data
};

axios.request(config)
.then((response) => {
    resolve(response)
})
.catch((error) => {
  resolve(error)
});

    })









}