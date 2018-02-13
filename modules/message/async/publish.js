var h = require('mutant/h')
var nest = require('depnest')
var when = require('mutant/when')

exports.needs = nest({
  'keys.sync.id': 'first',
  'sheet.display': 'first',
  'message.html.render': 'first',
  'sbot.async.publish': 'first',
  'intl.sync.i18n': 'first',
  'profile.obs.contact': 'first'
})

exports.gives = nest('message.async.publish')

exports.create = function (api) {

  const i18n = api.intl.sync.i18n
  return nest('message.async.publish', function (content, cb) {
    api.sheet.display(function (close) {
      const contact = api.profile.obs.contact(api.keys.sync.id())

      return {
        content: [
          api.message.html.render({value: {
            content,
            private: !!content.recps,
            author: api.keys.sync.id()
          }}),
          renderFollowerWarning()
        ],
        footer: [
          h('button -save', { 'ev-click': publish }, i18n('Confirm')),
          h('button -cancel', { 'ev-click': cancel }, i18n('Cancel'))
        ]
      }

      function renderFollowerWarning() {
        var warning = i18n("You have no followers. Your message will not be visible to anyone until you have at least one follower.")
        var pubHelp = i18n("The easiest way to get a follower is to redeem an invite code from a pub, which will follow you. See https://www.scuttlebutt.nz/getting-started.html for help. If the pub does not follow you back, try another one.")
        var moreInfo = i18n("Note: If you post your message, it will become visible to others later when you have followers.")

        var content = h('div', [
          h('div', warning),
          h('div', pubHelp),
          h('div', moreInfo)
        ])

        return when(contact.hasNoFollowers, content)
      }

      function publish () {
        close()
        api.sbot.async.publish(content, cb)
      }

      function cancel () {
        close()
        cb && cb(null, false)
      }
    })
    return true
  })
}
