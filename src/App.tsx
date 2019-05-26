import React, {Component} from 'react';
import axios from "axios";

import firebase from './initFirebase';

import './App.css';

type FunctionName = "onCall" | "onRequest" | "onRequestWithRewrite";

const FUNCTION_NAMES: FunctionName[] = ["onCall", "onRequestWithRewrite", "onRequest"];

type MyFunctions<T> = {
  [s in FunctionName]: T;
}

interface FunctionExecInfo {
  result: string,
  message: string,
  time: string,
  execCount: number,
}

interface PerformanceGraphRecord extends MyFunctions<string> {
  numOfExec: number,
}

interface AppState {
  f: MyFunctions<FunctionExecInfo>,
  graphData: PerformanceGraphRecord[],
}

class App extends Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      f: {
        onCall: {result: "", message: "", time: "", execCount: 0},
        onRequest: {result: "", message: "", time: "", execCount: 0},
        onRequestWithRewrite: {result: "", message: "", time: "", execCount: 0},
      },
      graphData: [],
    };
  }

  render() {
    return (
      <div className="App">
        <table>
          <tr>
            <td /><td>Result</td><td>ExecCount</td><td>Time</td><td>Message</td>
          </tr>
          {this.createFuncTableRecord(FUNCTION_NAMES)}
        </table>
      </div>
    )
  }

  private createFuncTableRecord(funcNames: FunctionName[]) {
    let records = [];
    for (let i: number = 0; i < funcNames.length; i++) {
      records.push((
        <FuncTableRecord
          onClick={() => {this.handleClick(funcNames[i],)}}
          value={funcNames[i]}
          execInfo={this.state.f[funcNames[i]]} />
      ))
    }
    return records;
  }

  private handleClick = async (name: FunctionName) => {
    this.state.f[name] = await this.perform(this.state.f[name].execCount, this.myFunctions[name])
      .catch((e) => {
        return {result: "NG", message: `${e}`, time: "", execCount: this.state.f[name].execCount}
      });

    this.setState({
      f: this.state.f,
    });
  };

  /**
   * @see {@link https://firebase.google.com/docs/functions/callable}
   * @see {@link https://firebase.google.com/docs/functions/locations}
   */
  private onCall = async (): Promise<string> => {
    const onCallFromTokyo = firebase
      .app()
      .functions("asia-northeast1")
      .httpsCallable("onCallFromTokyo");
    try {
      const result = await onCallFromTokyo({name: "sugi"});
      return result.data.message;
    } catch(e) {
      throw e;
    }
  };

  /**
   * @///<reference path="https://firebase.google.com/docs/hosting/functions.html?hl=en"/>
   */
  private onRequestWithRewrite = async (): Promise<string> => {
    try {
      const response = await axios.get("/onRequestWithRewrite?name=sugi");
      return response.data.message;
    } catch(e) {
      throw e;
    }
  };

  private onRequest = async (): Promise<string> => {
    try {
      const response = await axios.get("https://asia-northeast1-functions-call.cloudfunctions.net/onRequestFromTokyo?name=sugi");
      return response.data.message;
    } catch(e) {
      throw e;
    }
  };

  private perform = async (execCount: number, callback: () => Promise<string>): Promise<FunctionExecInfo> => {
    const start = performance.now();
    const res = await callback().catch((e) => {throw e});
    const result = performance.now() - start;
    return {
      result: "SUCCESS",
      message: res,
      time: result.toFixed(2),
      execCount: execCount + 1,
    };
  };

  private myFunctions: MyFunctions<() => Promise<string>> = {
    onCall: this.onCall,
    onRequest: this.onRequest,
    onRequestWithRewrite: this.onRequestWithRewrite,
  };
}

interface FuncProps {
  value: string,
  execInfo: FunctionExecInfo,
  onClick: () => void,
}

function FuncTableRecord(props: FuncProps) {
  return (
    <tr className="functiontable-record">
      <td><button className="btn-stitch" onClick={props.onClick}>{props.value}</button></td>
      <td className="function-result fade-in">{props.execInfo.result}</td>
      <td className="function-execCount fade-in">{props.execInfo.execCount}</td>
      <td className="function-time fade-in">{props.execInfo.time}</td>
      <td className="function-message fade-in">{props.execInfo.message}</td>
    </tr>
  )
}

export default App;
