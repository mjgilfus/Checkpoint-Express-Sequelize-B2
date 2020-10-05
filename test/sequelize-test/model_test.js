/* eslint-disable no-unused-expressions */
/* eslint-env mocha, chai */
'use strict';

const helper = require('../../helper');
const expect = require('chai').expect;
const db = require('../../models/sequelize-models/database');
const {Task, Owner} = require('../../models/sequelize-models');

/**
 * Start here
 *
 * These tests describe the model that you'll be setting up in models/task.model.js
 *
 */

describe('Task and Owner', function () {

  // clear the database before all tests
  before(() => {
    return db.sync({force: true});
  });

  // erase all tasks after each spec
  afterEach(() => {
    return db.sync({force: true});
  });

  describe('Class methods on Task', function () {

    beforeEach(async () => {
      await Promise.all([
        Task.create({ name: 't1', due: helper.dates.tomorrow() }),
        Task.create({ name: 't2', due: helper.dates.tomorrow(), complete: true }),
        Task.create({ name: 't3', due: helper.dates.yesterday() }),
        Task.create({ name: 't4', due: helper.dates.yesterday(), complete: true })
      ]);
    });

    describe('clearCompleted', function () {
      it('removes all completed tasks from the database', async function () {
        await Task.clearCompleted();

        const completedTasks = await Task.findAll({ where: { complete: true } });
        const incompleteTasks = await Task.findAll({ where: { complete: false } });

        expect(completedTasks).to.have.length(0);
        expect(incompleteTasks).to.have.length(2);
      });
    });

    describe('completeAll', function () {

      it('marks all incomplete tasks as completed', async function () {
        await Task.completeAll();

        const completedTasks = await Task.findAll({ where: { complete: true } });
        const incompleteTasks = await Task.findAll({ where: { complete: false } });

        expect(completedTasks).to.have.length(4);
        expect(incompleteTasks).to.have.length(0);
      });

    });

  });

  describe('Instance methods on Task', function () {

    describe('getTimeRemaining', function () {

      it('returns the Infinity value if task has no due date', function () {
        const task = Task.build();
        expect(task.getTimeRemaining()).to.equal(Infinity);
      });

      it('returns the difference between due date and now', function () {
        const oneDay = 24 * 60 * 60 * 1000; // one day in milliseconds

        // create a task due one day from this point in time
        const task = Task.build({
          due: helper.dates.tomorrow()
        });

        expect(task.getTimeRemaining()).to.be.closeTo(oneDay, 10); // within 10 ms
      });

    });

    describe('isOverdue', function () {

      it('is overdue if the due date is in the past', function () {
        const task = Task.build({
          due: helper.dates.yesterday()
        });
        expect(task.isOverdue()).to.be.true;
      });

      it('is not overdue if the due date is in the past but complete is true', function () {
        const task = Task.build({
          due: helper.dates.yesterday(),
          complete: true
        });
        expect(task.isOverdue()).to.be.false;
      });

      it('is not overdue if the due date is in the future', function () {
        const task = Task.build({
          due: helper.dates.tomorrow()
        });
        expect(task.isOverdue()).to.be.false;
      });
    });

    describe('assignOwner', function () {

      /*
        Hint: Remember magic methods?
        They are methods generated by Sequelize after associations have been set
        https://medium.com/@jasmine.esplago.munoz/feeling-the-magic-with-sequelize-magic-methods-e9cc89ecdcc5
      */

      it('should associate a task to an owner and return a promise', async function () {
        const task = await Task.create({ name: 'make pizza' });
        const owner = await Owner.create({ name: 'Priti' });

        const associatedTask = await task.assignOwner(owner)

        expect(associatedTask.OwnerId).to.equal(owner.id);
      });

    });


  });

  describe('Instance methods on Owner', function () {

    describe('getIncompleteTasks', function () {

      it('should return all incomplete tasks assigned to an owner', async function () {
        const taskData = [
          { name: 'get groceries', complete: true },
          { name: 'make dinner', complete: true },
          { name: 'clean home'},
          { name: 'bake a cake'}
        ]
        const owner = await Owner.create({ name: 'Finn' });

        const createdTasks = await Task.bulkCreate(taskData, {returning: true})

        await Promise.all(createdTasks.map(async (task) => {
          await task.setOwner(owner)
        }))

        const ownerWithAssociatedTasks = await Owner.findByPk(owner.id)
        const incompleteTasks = await ownerWithAssociatedTasks.getIncompleteTasks()

        expect(incompleteTasks).to.have.length(2);
      });

    });

  })

});
