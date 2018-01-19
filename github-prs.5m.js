#!/usr/bin/env /usr/local/bin/node

// <bitbar.title>Github PRs</bitbar.title>
// <bitbar.version>v0.1</bitbar.version>
// <bitbar.author>burakkirkil</bitbar.author>
// <bitbar.desc>Lists all PRs</bitbar.desc>
// <bitbar.author.github>burakkirkil</bitbar.author.github>
// <bitbar.dependencies>node.js</bitbar.dependencies>

/******************************************************************************
 * OPTIONS
 *****************************************************************************/

const MENUBAR_TITLE = '' // optional
const ORG = 'justice-league'
const REPOSITORIES = [
  'ironman'
  'thor',
  'hulk',
  'captain-america'
]
const GITHUB_ACCESS_TOKEN = '' // https://github.com/settings/tokens
const PER_PAGE = 50

/******************************************************************************
 * WHERE THE MAGIC HAPPENS
 *****************************************************************************/

const https = require('https')
const exec = require('child_process').exec
const refreshInterval = process.argv[1].split('.')[1]

var failures = 0
var totalCount = 0

function notify(options) {
  options.subtitle = options.subtitle || ''
  exec(`osascript -e 'display notification "${options.text}" with title "${options.title}" subtitle "${options.subtitle}" sound name "${options.sound}"'`)
}

function getMenu() {
  const totalCountText = totalCount ? ` (${totalCount})` : ''

  if (failures) {
    notify({
      title: `Github: ${ORG}`,
      text: `🔴 Error`
    })
  }

  // Menubar Text & Icon
  console.log(`${MENUBAR_TITLE ? MENUBAR_TITLE : ORG}${totalCountText}`)
  console.log('---')

  // Submenu
  console.log(`Refresh Now... | refresh=true`)
  console.log('Check Github API Rate Limit ❤︎ | href=https://api.github.com/rate_limit')
  console.log(`Auto Refresh in ${refreshInterval}`)
  console.log('---')

  if (!GITHUB_ACCESS_TOKEN) {
    console.log(`Get Access Token ⚠️ | href=https://github.com/settings/tokens`)
  }

  console.log('---')
}

function handleRepo(repo) {
  const prCountText = repo.count ? `` : ''
  const repoLink = `https://github.com/${ORG}/${repo.name}/pulls`

  // Repo
  console.log(`${repo.name} ${prCountText} | href=${repoLink} size=14`);

  if (repo.data.length > 0) {
    repo.data
      .filter(issue => issue.pull_request)
      .forEach((pull, index) => handlePullRequest(pull, index, repo.data.length))
  }

  console.log('---')
}

function handlePullRequest(pull, index, total) {
  const hasLabel = pull.labels ? !!pull.labels.length : false;
  const extraOptions = hasLabel ? `color=#666666` : ''; // dim colors for pull request has label
  const icon = hasLabel ? '⌦' : '├'

  // Pull Request
  console.log(`${icon} ${pull.title} | href=${pull.html_url} size=12 ${extraOptions}`)

  // Dropdown
  console.log(`-- 👤 ${pull.user.login} | size=10`)

  if (hasLabel){
    pull.labels.forEach(label => {
      console.log(`-- ⌦ ${label.name} | size=10 color=#666666`)
    })
  }
}

function getOptions(repository) {
  return {
    host: 'api.github.com',
    headers: {'user-agent': 'Awesome-App'},
    path: `/repos/${ORG}/${repository}/issues?access_token=${GITHUB_ACCESS_TOKEN}&per_page=${PER_PAGE}`
  };
}

if (ORG && GITHUB_ACCESS_TOKEN) {
  if (REPOSITORIES.length > 0) {
    const promises = REPOSITORIES.map(repo => new Promise((resolve, reject) => {

      const request = https.get(getOptions(repo), (response) => {
        var data = ''

        response.on('data', (chunk) => {
          data += chunk
        })

        response.on('end', () => {
          if (response.statusCode === 200) {
            const pullRequestData = JSON.parse(data)
            totalCount += pullRequestData.length
            resolve({
              name: repo,
              count: pullRequestData.length,
              data: pullRequestData,
            })
          } else {
            failures++
            resolve(`‼️ There is no repository named ${repo} | color=red`)
          }
        })

        response.on('error', function(err) {
          failures++
          reject(err)
        })

      }).on("error", (err) => {
        failures++
        reject(err)
      })

      request.end()
    }))

    Promise
      .all(promises)
      .then(result => {
        getMenu()
        result.forEach(repo => handleRepo(repo))
      })
      .catch(err => {
        console.log('---')
        console.log(`‼️ ${err} | color=red`)
      })
  } else {
    getMenu()
    console.log('⚠️ There is no job')
  }
} else {
  getMenu()
}
