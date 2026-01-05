// src/models/mlpModels.js
import * as tf from '@tensorflow/tfjs';

export async function trainMLPModel(preparedData, config, progressCallback) {
  const { trainX, trainY, testX, testY, scaler, years } = preparedData;
  const { lookback, hiddenUnits, activation, epochs, forecastYears } = config;

  // Reshape data for MLP (flatten the sequence dimension)
  const trainXReshaped = tf.reshape(trainX, [trainX.shape[0], lookback]);
  const testXReshaped = tf.reshape(testX, [testX.shape[0], lookback]);

  // Create MLP model
  const model = tf.sequential();

  model.add(tf.layers.dense({
    units: hiddenUnits,
    activation: activation,
    inputShape: [lookback]
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({
    units: Math.floor(hiddenUnits / 2),
    activation: activation
  }));

  model.add(tf.layers.dropout({ rate: 0.2 }));

  model.add(tf.layers.dense({ units: 1 }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'meanSquaredError',
    metrics: ['mae']
  });

  console.log('MLP Model Summary:');
  model.summary();

  const history = [];

  await model.fit(trainXReshaped, trainY, {
    epochs: epochs,
    batchSize: 32,
    validationSplit: 0.2,
    shuffle: true,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const progress = Math.round(((epoch + 1) / epochs) * 100);
        progressCallback(progress);
        
        history.push({
          epoch: epoch + 1,
          loss: logs.loss,
          valLoss: logs.val_loss || 0
        });

        console.log(`Epoch ${epoch + 1}/${epochs} - Loss: ${logs.loss.toFixed(4)}`);
      }
    }
  });

  const predictions = model.predict(testXReshaped);
  const predArray = await predictions.array();
  const testYArray = await testY.array();

  const mae = predArray.reduce((sum, pred, i) => 
    sum + Math.abs(pred[0] - testYArray[i][0]), 0
  ) / predArray.length;

  const mape = predArray.reduce((sum, pred, i) => {
    const actual = testYArray[i][0];
    if (actual === 0) return sum;
    return sum + Math.abs((actual - pred[0]) / actual);
  }, 0) / predArray.length;
  
  const accuracy = Math.max(0, (1 - mape) * 100);

  const lastSequenceArray = trainX.arraySync().slice(-1)[0];
  const flatLastSequence = lastSequenceArray.map(x => x[0]);
  
  const futurePredictions = [];
  let currentSequence = [...flatLastSequence];

  for (let i = 0; i < forecastYears; i++) {
    const inputTensor = tf.tensor2d([currentSequence], [1, lookback]);
    const nextPred = model.predict(inputTensor);
    const nextValue = (await nextPred.array())[0][0];
    futurePredictions.push(nextValue);

    currentSequence = [...currentSequence.slice(1), nextValue];
    
    inputTensor.dispose();
    nextPred.dispose();
  }

  const denormalizedPredictions = predArray.map(p => scaler.inverse(p[0]));
  const denormalizedFuture = futurePredictions.map(p => scaler.inverse(p));

  const lastYear = years[years.length - 1];
  const chartData = [];

  // Show ALL actual historical data from database (1988-2020)
  // Use the original values from data preparation, not just test data
  const allOriginalValues = preparedData.originalValues;
  const allYears = preparedData.years;
  
  allYears.forEach((year, i) => {
    chartData.push({
      year: year,
      actual: Math.round(allOriginalValues[i]),
      predicted: null
    });
  });

  // Add forecast data with rounded whole numbers
  for (let i = 0; i < forecastYears; i++) {
    chartData.push({
      year: lastYear + i + 1,
      actual: null,
      predicted: Math.round(denormalizedFuture[i])
    });
  }

  model.dispose();
  predictions.dispose();
  trainXReshaped.dispose();
  testXReshaped.dispose();

  return {
    config: config,
    mae: mae,
    accuracy: accuracy,
    predictions: denormalizedPredictions,
    forecast: denormalizedFuture,
    chartData: chartData,
    history: history
  };
}