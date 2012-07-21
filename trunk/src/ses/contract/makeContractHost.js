// Copyright (C) 2012 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Simple AMD module exports a makeContractHost
 * function, which makes a contract host, which makes and runs a
 * contract. Requires ses. Specifically, requires the eval function in
 * scope to be a SES confining eval.
 * @requires WeakMap, define, Q, eval
 * @author Mark S. Miller erights@gmail.com
 */
define('makeContractHost', [], function() {
  "use strict";

  /**
   * A contract host as a mutually trusted third party for honestly
   * running whatever smart contract code its customers agree on.
   *
   * <p>When mutually suspicious parties wish to engage in a joint
   * contract, if they can agree on a contract host to be run the
   * following code honestly, agree on the code that represents their
   * smart contract, and agree on which side of the contract they each
   * play, then they can validly engage in the contract.
   *
   * <p>The contractSrc is assumed to be the source code for a closed
   * SES function, where each of the parties to the contract is
   * supposed to provide their respective fulfilled arguments. Once all
   * these arguments are fulfilled, then the contract is run.
   */
  return function makeContractHost() {
    var amp = WeakMap();

    return def({
      setup: function(contractSrc) {
        contractSrc = String(contractSrc);
        var contract = eval(contractSrc);
        var result = Q.defer();
        var tokens = [];
        var argPs = [];

        function addParam(i, token, argPair) {
          tokens[i] = token;
          argPs[i] = argPair.promise;
          amp.set(token, def(function(allegedSrc, allegedI, arg) {
            if (contractSrc !== allegedSrc) {
              throw new Error('unexpected contract: ' + contractSrc);
            }
            if (i !== allegedI) {
              throw new Error('unexpected player number: ' + i);
            }
            amp.delete(token);
            argPair.resolve(arg);
            return result.promise;
          }));
        }
        for (var i = 0; i < contract.length; i++) {
          addParam(i, def({}), Q.defer());
        }

        result.resolve(Q.all(argPs).when(function(args) {
          return contract.apply(void 0, args);
        }));
        return tokens;
      },
      redeem: amp.get.bind(amp)
    });
  };
});