/**
 * Copyright 2018, Google, Inc.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const path = require('path');
const assert = require('assert');
const tools = require('@google-cloud/nodejs-repo-tools');
const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();
const uuid = require('uuid');

const cmd = 'node inspect.js';
const cwd = path.join(__dirname, '..');
const bucket = 'nodejs-docs-samples-dlp';
const dataProject = 'nodejs-docs-samples';

// Create new custom topic/subscription
let topic, subscription;
const topicName = `dlp-inspect-topic-${uuid.v4()}`;
const subscriptionName = `dlp-inspect-subscription-${uuid.v4()}`;
before(async () => {
  tools.checkCredentials();
  await pubsub
    .createTopic(topicName)
    .then(response => {
      topic = response[0];
      return topic.createSubscription(subscriptionName);
    })
    .then(response => {
      subscription = response[0];
    });
});

// Delete custom topic/subscription
after(async () => await subscription.delete().then(() => topic.delete()));

// inspect_string
it('should inspect a string', async () => {
  const output = await tools.runAsync(
    `${cmd} string "I'm Gary and my email is gary@example.com"`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Info type: EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should handle a string with no sensitive data', async () => {
  const output = await tools.runAsync(`${cmd} string "foo"`, cwd);
  assert.strictEqual(output, 'No findings.');
});

it('should report string inspection handling errors', async () => {
  const output = await tools.runAsync(
    `${cmd} string "I'm Gary and my email is gary@example.com" -t BAD_TYPE`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Error in inspectString/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

// inspect_file
it('should inspect a local text file', async () => {
  const output = await tools.runAsync(`${cmd} file resources/test.txt`, cwd);
  assert.strictEqual(
    new RegExp(/Info type: PHONE_NUMBER/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
  assert.strictEqual(
    new RegExp(/Info type: EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should inspect a local image file', async () => {
  const output = await tools.runAsync(`${cmd} file resources/test.png`, cwd);
  assert.strictEqual(
    new RegExp(/Info type: EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should handle a local file with no sensitive data', async () => {
  const output = await tools.runAsync(
    `${cmd} file resources/harmless.txt`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/No findings/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should report local file handling errors', async () => {
  const output = await tools.runAsync(
    `${cmd} file resources/harmless.txt -t BAD_TYPE`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Error in inspectFile/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

// inspect_gcs_file
it.skip('should inspect a GCS text file', async () => {
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} text.txt ${topicName} ${subscriptionName}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType PHONE_NUMBER/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should inspect multiple GCS text files', async () => {
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} "*.txt" ${topicName} ${subscriptionName}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType PHONE_NUMBER/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should inspect GCS text files with sampling', async () => {
  const bytesLimit = 1024;
  const filesPercent = 50;
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} "*.txt" ${topicName} ${subscriptionName} ${bytesLimit} ${filesPercent}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/status: DONE/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should report misconfigured GCS sampling', async () => {
  const bytesLimit = 1024;
  const filesPercent = 1000;
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} "*.txt" ${topicName} ${subscriptionName} ${bytesLimit} ${filesPercent}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(
      /`files_limit_percent` must be between 0 to 100, inclusively/
    ).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should handle a GCS file with no sensitive data', async () => {
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} harmless.txt ${topicName} ${subscriptionName}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/No findings/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should report GCS file handling errors', async () => {
  const output = await tools.runAsync(
    `${cmd} gcsFile ${bucket} harmless.txt ${topicName} ${subscriptionName} -t BAD_TYPE`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Error in inspectGCSFile/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

// inspect_datastore
it.skip('should inspect Datastore', async () => {
  const output = await tools.runAsync(
    `${cmd} datastore Person ${topicName} ${subscriptionName} --namespaceId DLP -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType EMAIL_ADDRESS/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should handle Datastore with no sensitive data', async () => {
  const output = await tools.runAsync(
    `${cmd} datastore Harmless ${topicName} ${subscriptionName} --namespaceId DLP -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/No findings/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should report Datastore errors', async () => {
  const output = await tools.runAsync(
    `${cmd} datastore Harmless ${topicName} ${subscriptionName} --namespaceId DLP -t BAD_TYPE -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Error in inspectDatastore/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

// inspect_bigquery
it.skip('should inspect a Bigquery table', async () => {
  const output = await tools.runAsync(
    `${cmd} bigquery integration_tests_dlp harmful ${topicName} ${subscriptionName} -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Found \d instance\(s\) of infoType PHONE_NUMBER/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it.skip('should handle a Bigquery table with no sensitive data', async () => {
  const output = await tools.runAsync(
    `${cmd} bigquery integration_tests_dlp harmless ${topicName} ${subscriptionName} -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/No findings/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

it('should report Bigquery table handling errors', async () => {
  const output = await tools.runAsync(
    `${cmd} bigquery integration_tests_dlp harmless ${topicName} ${subscriptionName} -t BAD_TYPE -p ${dataProject}`,
    cwd
  );
  assert.strictEqual(
    new RegExp(/Error in inspectBigquery/).test(output),
    true,
    `Actual output was:\n ${output}`
  );
});

// CLI options
it('should have a minLikelihood option', async () => {
  const promiseA = tools.runAsync(
    `${cmd} string "My phone number is (123) 456-7890." -m LIKELY`,
    cwd
  );
  const promiseB = tools.runAsync(
    `${cmd} string "My phone number is (123) 456-7890." -m UNLIKELY`,
    cwd
  );

  const outputA = await promiseA;
  assert.ok(outputA);
  assert.strictEqual(
    new RegExp(/PHONE_NUMBER/).test(outputA),
    false,
    `Actual output was:\n ${outputA}`
  );

  const outputB = await promiseB;
  assert.strictEqual(
    new RegExp(/PHONE_NUMBER/).test(outputB),
    true,
    `Actual output was:\n ${outputB}`
  );
});

it('should have a maxFindings option', async () => {
  const promiseA = tools.runAsync(
    `${cmd} string "My email is gary@example.com and my phone number is (223) 456-7890." -f 1`,
    cwd
  );
  const promiseB = tools.runAsync(
    `${cmd} string "My email is gary@example.com and my phone number is (223) 456-7890." -f 2`,
    cwd
  );

  const outputA = await promiseA;
  assert.notStrictEqual(
    outputA.includes('PHONE_NUMBER'),
    outputA.includes('EMAIL_ADDRESS')
  ); // Exactly one of these should be included

  const outputB = await promiseB;
  assert.strictEqual(
    new RegExp(/PHONE_NUMBER/).test(outputB),
    true,
    `Actual output was:\n ${outputB}`
  );
  assert.strictEqual(
    new RegExp(/EMAIL_ADDRESS/).test(outputB),
    true,
    `Actual output was:\n ${outputB}`
  );
});

it('should have an option to include quotes', async () => {
  const promiseA = tools.runAsync(
    `${cmd} string "My phone number is (223) 456-7890." -q false`,
    cwd
  );
  const promiseB = tools.runAsync(
    `${cmd} string "My phone number is (223) 456-7890."`,
    cwd
  );

  const outputA = await promiseA;
  assert.ok(outputA);
  assert.strictEqual(
    new RegExp(/\(223\) 456-7890/).test(outputA),
    false,
    `Actual output was:\n ${outputA}`
  );

  const outputB = await promiseB;
  assert.strictEqual(
    new RegExp(/\(223\) 456-7890/).test(outputB),
    true,
    `Actual output was:\n ${outputB}`
  );
});

it('should have an option to filter results by infoType', async () => {
  const promiseA = tools.runAsync(
    `${cmd} string "My email is gary@example.com and my phone number is (223) 456-7890."`,
    cwd
  );
  const promiseB = tools.runAsync(
    `${cmd} string "My email is gary@example.com and my phone number is (223) 456-7890." -t PHONE_NUMBER`,
    cwd
  );

  const outputA = await promiseA;
  assert.strictEqual(
    new RegExp(/EMAIL_ADDRESS/).test(outputA),
    true,
    `Actual output was:\n ${outputA}`
  );
  assert.strictEqual(
    new RegExp(/PHONE_NUMBER/).test(outputA),
    true,
    `Actual output was:\n ${outputA}`
  );

  const outputB = await promiseB;
  assert.strictEqual(
    new RegExp(/EMAIL_ADDRESS/).test(outputB),
    false,
    `Actual output was:\n ${outputB}`
  );
  assert.strictEqual(
    new RegExp(/PHONE_NUMBER/).test(outputB),
    true,
    `Actual output was:\n ${outputB}`
  );
});
