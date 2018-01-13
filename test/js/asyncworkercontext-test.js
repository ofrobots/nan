/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2017 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

try {
  require('async_hooks')
} catch (e) {
  process.exit();
}

const test     = require('tap').test
    , testRoot = require('path').resolve(__dirname, '..')
    , bindings = require('bindings')({ module_root: testRoot, bindings: 'asyncworkercontext' })
    , async_hooks = require('async_hooks')

const doSleep = bindings.doSleep

test('asyncworker should propagate context', function (t) {
  let sleepId;
  let beforeCalled;
  let afterCalled;
  const hooks = async_hooks.createHook({
    init(id, type, triggerId) {
      if (type === 'Nan::Test::SleepWorker') {
        sleepId = id;
      }
    },

    before(id) {
      if (id == sleepId) {
        beforeCalled = true
      }
    },

    after(id) {
      if (id == sleepId) {
        afterCalled = true
      }
    }
  });
  hooks.enable()


  doSleep(200, function () {
    t.ok(sleepId, 'initialized resource. id ' + sleepId);
    t.ok(beforeCalled, 'before called');
    t.notOk(afterCalled, 'after should not yet be called');
    setTimeout(() => {
      t.ok(afterCalled, 'after called')
      t.end();
      hooks.disable()
    }, 10);
  })
})

test('asyncwoker context should work with multiple concurrent workers', function (t) {
  const sleepIds = []
  const beforeIds = []
  const afterIds = []

  const hooks = async_hooks.createHook({
    init(id, type, triggerId) {
      if (type === 'Nan::Test::SleepWorker') {
        sleepIds.push(id);
      }
    },

    before(id) {
      if (sleepIds.includes(id)) {
        beforeIds.push(id)
      }
    },

    after(id) {
      if (beforeIds.includes(id)) {
        afterIds.push(id)
      }
    }
  });
  hooks.enable()

  let callbacksDone = 0
  function callback() {
    callbacksDone++
    if (callbacksDone == 2) {
      t.equals(sleepIds.length, 2, 'both resources should be initialized')
      t.equals(beforeIds.length, 2, 'before should be called for both')
      setTimeout(function() {
        t.equals(afterIds.length, 2, 'after should be called for both')
        t.end()
        hooks.disable()
      }, 10)
    }
  }
  doSleep(200, callback)
  doSleep(200, callback)
})

test('asyncworker context should not bind to callback', {skip: true}, function () {
  // This test doesn't work yet. See comment in the cpp file.
  const sleepIds = []
  const beforeIds = []
  const afterIds = []
  const hooks = async_hooks.createHook({
    init(id, type, triggerId) {
      if (type.startsWith('Nan::Test::SleepWorker')) {
        sleepIds.push(id);
      }
    },

    before(id) {
      if (sleepIds.includes(id)) {
        beforeIds.push(id)
      }
    },

    after(id) {
      if (beforeIds.includes(id)) {
        afterIds.push(id)
      }
    }
  });
  hooks.enable()

  let callbacksDone = 0
  bindings.doSleepDouble(200, function () {
    // This callback should be called twice
    callbacksDone++
    if (callbacksDone === 2) {
      t.equals(sleepIds.length, 2, 'both resources should be initialized')
      t.equals(beforeIds.length, 2, 'before should be called for both')
      setTimeout(function() {
        t.equals(afterIds.length, 2, 'after should be called for both')
        t.end()
        hooks.disable()
      }, 10)
    }
  })
})
