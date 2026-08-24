import { describe, it, expect } from 'vitest';

import { type Convive } from '../entities/convive';
import { type ConviveRepository } from '../ports/convive-repository';
import { ConviveBuilder } from '../test-builders/convive.builder';
import { InMemoryConviveRepository } from '../test-doubles/in-memory-convive-repository';
import { observeConvivesUseCase } from './observe-convives';

function collecting(): { emissions: Convive[][]; listener: (convives: Convive[]) => void } {
  const emissions: Convive[][] = [];
  return { emissions, listener: (convives) => emissions.push(convives) };
}

describe('observeConvivesUseCase', () => {
  it('trie la première émission par prénom, alphabétique croissant, insensible casse/accents (fr)', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Zoé').build());
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('élise').build());
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c3').withName('Alice').build());
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c4').withName('bruno').build());
    const observeConvives = observeConvivesUseCase({ conviveRepository });
    const collector = collecting();

    observeConvives(collector.listener, () => {});

    expect(collector.emissions.at(-1)?.map((convive) => convive.name)).toEqual([
      'Alice',
      'bruno',
      'élise',
      'Zoé',
    ]);
  });

  it('trie AUSSI les émissions suivantes, pas seulement la première', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Alice').build());
    const observeConvives = observeConvivesUseCase({ conviveRepository });
    const collector = collecting();
    observeConvives(collector.listener, () => {});

    await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Zoé').build());

    expect(collector.emissions.at(-1)?.map((convive) => convive.name)).toEqual(['Alice', 'Zoé']);
  });

  it('ne mute pas le tableau émis par le dépôt', () => {
    const source = [
      ConviveBuilder.aConvive().withId('c1').withName('Zoé').build(),
      ConviveBuilder.aConvive().withId('c2').withName('Alice').build(),
    ];
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve(source),
      updateExisting: () => Promise.resolve(undefined),
      remove: () => Promise.resolve(),
      observeAll: (listener) => {
        listener(source);
        return () => {};
      },
    };
    const observeConvives = observeConvivesUseCase({ conviveRepository });
    const collector = collecting();

    observeConvives(collector.listener, () => {});

    expect(collector.emissions.at(-1)?.map((convive) => convive.name)).toEqual(['Alice', 'Zoé']);
    expect(source.map((convive) => convive.name)).toEqual(['Zoé', 'Alice']);
  });

  it('transmet l’erreur du dépôt à onError, sans passer par le listener', () => {
    const conviveRepository: ConviveRepository = {
      save: () => Promise.resolve(),
      findAll: () => Promise.resolve([]),
      updateExisting: () => Promise.resolve(undefined),
      remove: () => Promise.resolve(),
      observeAll: (_listener, onError) => {
        onError(new Error('boom'));
        return () => {};
      },
    };
    const observeConvives = observeConvivesUseCase({ conviveRepository });
    const collector = collecting();
    const errors: unknown[] = [];

    observeConvives(collector.listener, (error) => errors.push(error));

    expect(errors).toHaveLength(1);
    expect(errors.at(0)).toBeInstanceOf(Error);
    expect((errors.at(0) as Error).message).toBe('boom');
    expect(collector.emissions).toHaveLength(0);
  });

  it('rend le désabonnement du dépôt : après lui, une écriture n’émet plus rien', async () => {
    const conviveRepository = InMemoryConviveRepository.create();
    const observeConvives = observeConvivesUseCase({ conviveRepository });
    const collector = collecting();

    const unsubscribe = observeConvives(collector.listener, () => {});
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c1').withName('Zoé').build());
    expect(collector.emissions).toHaveLength(2);

    unsubscribe();
    await conviveRepository.save(ConviveBuilder.aConvive().withId('c2').withName('Alice').build());

    expect(collector.emissions).toHaveLength(2);
  });
});
