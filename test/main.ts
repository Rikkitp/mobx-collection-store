import {computed, extendObservable} from 'mobx';

const expect = require('chai').expect;

import {Collection, Model} from '../src';

describe('MobX Collection Store', function() {
  it('should do the basic init', function() {
    const collection = new Collection();
    expect(collection.find).to.be.a('function');
  });

  it('should use basic models', function() {
    class FooModel extends Model {
      static type = 'foo'
    }

    class TestCollection extends Collection {
      static types = [FooModel]
    }

    const collection = new TestCollection();
    const model = collection.add({
      id: 1,
      foo: 1,
      bar: 0,
      fooBar: 0.5
    }, 'foo');

    expect(collection.length).to.equal(1);
    expect(collection['foo'].length).to.equal(1);
    expect(collection.find('foo', 1)).to.equal(model);
    expect(model.id).to.equal(1);
    expect(model.attrs['foo']).to.equal(1);
    expect(model.attrs['bar']).to.equal(0);
    expect(model.type).to.equal('foo');
  });

  it('should be able to upsert models', function() {
    class FooModel extends Model {
      static type = 'foo'
    }

    class TestCollection extends Collection {
      static types = [FooModel]
    }

    const collection = new TestCollection();
    const model = collection.add({
      id: 1,
      foo: 1,
      bar: 0,
      fooBar: 0.5
    }, 'foo');

    const model2 = collection.add({
      id: 1,
      foo: 2,
      bar: 1,
      fooBar: 1.5
    }, 'foo');

    expect(collection.length).to.equal(1);
    expect(collection.find('foo', 1)).to.equal(model);
    expect(model.id).to.equal(1);
    expect(model.attrs['foo']).to.equal(2);
    expect(model.attrs['bar']).to.equal(1);
  });

  it('should support basic relations and serializing', function() {
    class FooModel extends Model {
      static type = 'foo'
      static refs = {bar: 'foo', fooBar: 'foo'}
    }

    class TestCollection extends Collection {
      static types = [FooModel]
    }

    const collection = new TestCollection();
    const model = collection.add({
      id: 1,
      foo: 0,
      bar: 1,
      fooBar: 0.5
    }, 'foo');

    // Check if the references are ok
    expect(collection.length).to.equal(1);
    expect(collection.find('foo', 1)).to.equal(model);
    expect(model.id).to.equal(1);
    expect(model.attrs['foo']).to.equal(0);
    expect(model.refs['bar']).to.equal(model);
    expect(model.attrs['bar']).to.equal(1);
    expect(model.refs['fooBar']).to.equal(null);
    expect(model.attrs['fooBar']).to.equal(0.5);
    expect(model.refs['bar'].refs['bar']).to.equal(model);

    // Clone the collection and check new references
    const collection2 = new TestCollection(collection.toJS());
    const model2 = collection2.find('foo');
    expect(collection2.length).to.equal(1);
    expect(collection2.find('foo', 1)).to.equal(model2);
    expect(model2.id).to.equal(1);
    expect(model2.attrs['foo']).to.equal(0);
    expect(model2.refs['bar']).to.equal(model2);
    expect(model2.attrs['bar']).to.equal(1);
    expect(model2.refs['fooBar']).to.equal(null);
    expect(model2.attrs['fooBar']).to.equal(0.5);
    expect(model2.refs['bar'].refs['bar']).to.equal(model2);

    // Check if the model is a proper clone
    model.set('fooBar', 1);
    expect(model.attrs['fooBar']).to.equal(1);
    expect(model2.attrs['fooBar']).to.equal(0.5);

    // Try to remove a non-existing model
    collection.remove('foo', 2);
    expect(collection.length).to.equal(1);

    // Remove a model and check that it still exists in the cloned collection
    collection.remove('foo', 1);
    expect(collection.length).to.equal(0);
    expect(collection2.length).to.equal(1);

    // Try to remove all models of an unexisting type
    collection2.removeAll('foobar');
    expect(collection2.length).to.equal(1);

    // Remove all models of the foo type
    collection2.removeAll('foo');
    expect(collection2.length).to.equal(0);
  });

  it('should work for the readme example', function() {
    class Person extends Model {
      constructor(initialData: Object, collection?: Collection) {
        super(initialData, collection);
        extendObservable(this, {
          fullName: computed(() => `${this.attrs['firstName']} ${this.attrs['lastName']}`)
        });
      }
    }

    Person.type = 'person';
    Person.refs = {spouse: 'person'};

    class Pet extends Model {
      static type = 'pet';
      static refs = {
        owner: 'person'
      }
    }

    class MyCollection extends Collection {
      static types = [Person, Pet]
    }

    const collection = new MyCollection();

    const john = collection.add({
      id: 1,
      spouse: 2,
      firstName: 'John',
      lastName: 'Doe'
    }, 'person');

    const fido = collection.add({
      id: 1,
      owner: john,
      name: 'Fido'
    }, 'pet');

    const jane = new Person({
      id: 2,
      spouse: 1,
      firstName: 'Jane',
      lastName: 'Doe'
    });
    collection.add(jane);

    expect(john.refs['spouse'].fullName).to.equal('Jane Doe');
    expect(fido.refs['owner'].fullName).to.equal('John Doe');
    expect(fido.refs['owner'].refs.spouse.fullName).to.equal('Jane Doe');
    expect(collection['person'].length).to.equal(2);
    expect(collection.length).to.equal(3);

    fido.set('owner', {
      id: 3,
      firstName: 'Dave',
      lastName: 'Jones'
    });

    expect(fido.refs['owner'].fullName).to.equal('Dave Jones');
    expect(collection['person'].length).to.equal(3);
    expect(collection.length).to.equal(4);

    fido.set('owner', jane);
    expect(fido.refs['owner'].fullName).to.equal('Jane Doe');
  });
});
