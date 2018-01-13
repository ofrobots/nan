/*********************************************************************
 * NAN - Native Abstractions for Node.js
 *
 * Copyright (c) 2017 NAN contributors
 *
 * MIT License <https://github.com/nodejs/nan/blob/master/LICENSE.md>
 ********************************************************************/

#ifndef _WIN32
#include <unistd.h>
#define Sleep(x) usleep((x)*1000)
#endif
#include <nan.h>

using namespace Nan;  // NOLINT(build/namespaces)

class SleepWorker : public AsyncWorker {
 public:
  SleepWorker(Callback *callback, int milliseconds, const char* name)
    : AsyncWorker(callback, name),
      milliseconds(milliseconds) {}
  ~SleepWorker() {}

  void Execute () {
    Sleep(milliseconds);
  }

 private:
  int milliseconds;
};

NAN_METHOD(DoSleep) {
  Callback *callback = new Callback(To<v8::Function>(info[1]).ToLocalChecked());
  AsyncQueueWorker(
      new SleepWorker(callback,
                      To<uint32_t>(info[0]).FromJust(),
                      "Nan::Test::SleepWorker"));
}

NAN_METHOD(DoSleepDouble) {
  // Reuse the same Nan::Callback for multiple async work. This helps ensure
  // that the context binding happens in the Worker rather than in Callback.
  // Users may use a Callback multiple times and storing context state in the
  // Callback will lead to context loss and confusion.
  //
  // It turns out that the above isn't actually true! AsyncWorker takes
  // ownership of the Callback pointer and will delete when one of the workers
  // is complete. This means that it is not possible for multiple workers to
  // share a Callback. However, users of Callback that are not using AsyncWorker
  // may yet be sharing Callback objects; making them unsafe to bind to context.
  Callback *callback = new Callback(To<v8::Function>(info[1]).ToLocalChecked());
  AsyncQueueWorker(
      new SleepWorker(callback,
                      To<uint32_t>(info[0]).FromJust(),
                      "Nan::Test::SleepWorker1"));
  AsyncQueueWorker(
      new SleepWorker(callback,
                      To<uint32_t>(info[0]).FromJust(),
                      "Nan::Test::SleepWorker2"));
}

NAN_MODULE_INIT(Init) {
  Set(target
    , New<v8::String>("doSleep").ToLocalChecked()
    , New<v8::FunctionTemplate>(DoSleep)->GetFunction());
  Set(target
    , New<v8::String>("doSleepDouble").ToLocalChecked()
    , New<v8::FunctionTemplate>(DoSleepDouble)->GetFunction());
}

NODE_MODULE(asyncworkercontext, Init)


